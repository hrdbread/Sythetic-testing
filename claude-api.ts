import { Persona, PersonaTestingCriteria, personaTestingCriteria } from './personas';

// Types for API responses and structured results
export interface Issue {
  severity: 'critical' | 'moderate' | 'minor';
  category: 'usability' | 'accessibility' | 'visual' | 'interaction';
  description: string;
  suggestion: string;
  location?: string;
}

export interface PersonaAnalysis {
  personaId: string;
  personaName: string;
  overallScore: number;
  categoryScores: {
    usability: number;
    accessibility: number;
    visual: number;
    interaction: number;
  };
  issues: Issue[];
  strengths: string[];
}

export interface FrameAnalysisResult {
  frameId: string;
  frameName: string;
  analyses: PersonaAnalysis[];
  overallScore: number;
  aggregatedIssues: Issue[];
}

export interface ClaudeAPIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}

export class ClaudeAPIClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeAPIConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4000;
  }

  /**
   * Analyze a UI frame with multiple personas
   */
  async analyzeFrame(
    frameImage: string,
    frameName: string,
    frameId: string,
    personas: Persona[],
    frameMetadata?: any
  ): Promise<FrameAnalysisResult> {
    try {
      const analyses: PersonaAnalysis[] = [];

      // Analyze with each persona
      for (const persona of personas) {
        try {
          const analysis = await this.analyzeWithPersona(
            frameImage,
            persona,
            frameMetadata
          );
          analyses.push(analysis);
        } catch (error) {
          console.error(`Failed to analyze with persona ${persona.name}:`, error);
          // Add fallback analysis for failed persona
          analyses.push(this.createFailbackAnalysis(persona));
        }
      }

      // Aggregate results
      const overallScore = this.calculateOverallScore(analyses);
      const aggregatedIssues = this.aggregateIssues(analyses);

      return {
        frameId,
        frameName,
        analyses,
        overallScore,
        aggregatedIssues
      };

    } catch (error) {
      console.error('Frame analysis failed:', error);
      throw new Error(`Failed to analyze frame: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze UI with a specific persona
   */
  private async analyzeWithPersona(
    imageData: string,
    persona: Persona,
    metadata?: any
  ): Promise<PersonaAnalysis> {
    const prompt = this.buildPersonaPrompt(persona, metadata);
    
    try {
      const response = await this.makeAPIRequest(imageData, prompt);
      return this.parsePersonaResponse(response, persona);
    } catch (error) {
      console.error(`API request failed for persona ${persona.name}:`, error);
      throw error;
    }
  }

  /**
   * Build persona-specific analysis prompt
   */
  private buildPersonaPrompt(persona: Persona, metadata?: any): string {
    const metadataContext = metadata ? `
Frame metadata:
- Contains text: ${metadata.hasText}
- Contains buttons: ${metadata.hasButtons}
- Contains images: ${metadata.hasImages}
- Text elements: ${metadata.textCount}
- Button elements: ${metadata.buttonCount}
- Image elements: ${metadata.imageCount}
` : '';

    return `You are conducting a UX analysis from the perspective of "${persona.name}": ${persona.description}

Key limitations you experience:
${persona.limitations.map(l => `- ${l}`).join('\n')}

Your strengths in analysis:
${persona.strengths.map(s => `- ${s}`).join('\n')}

Focus areas for this analysis:
${persona.testingFocusAreas.map(f => `- ${f}`).join('\n')}

${metadataContext}

Please analyze this UI screenshot and provide a structured response in the following JSON format:

{
  "overallScore": number (0-100),
  "categoryScores": {
    "usability": number (0-100),
    "accessibility": number (0-100), 
    "visual": number (0-100),
    "interaction": number (0-100)
  },
  "issues": [
    {
      "severity": "critical" | "moderate" | "minor",
      "category": "usability" | "accessibility" | "visual" | "interaction",
      "description": "Clear description of the issue",
      "suggestion": "Specific improvement recommendation",
      "location": "Where in the UI this issue occurs (optional)"
    }
  ],
  "strengths": [
    "Positive aspects of the design from this persona's perspective"
  ]
}

Scoring guidelines:
- 90-100: Excellent, meets all expectations for this persona
- 70-89: Good, minor issues that don't significantly impact experience
- 50-69: Fair, moderate issues that affect usability
- 30-49: Poor, significant problems that hinder task completion
- 0-29: Critical, major barriers to use

Focus your analysis on issues that would specifically impact someone with your persona's characteristics, limitations, and use patterns.`;
  }

  /**
   * Make API request to Claude
   */
  private async makeAPIRequest(imageData: string, prompt: string): Promise<any> {
    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    
    if (!responseData.content || !responseData.content[0]) {
      throw new Error('Invalid API response structure');
    }

    return responseData.content[0].text;
  }

  /**
   * Parse Claude's response into structured PersonaAnalysis
   */
  private parsePersonaResponse(responseText: string, persona: Persona): PersonaAnalysis {
    try {
      // Extract JSON from response (Claude sometimes adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the response
      const analysis: PersonaAnalysis = {
        personaId: persona.id,
        personaName: persona.name,
        overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
        categoryScores: {
          usability: Math.max(0, Math.min(100, parsed.categoryScores && parsed.categoryScores.usability || 0)),
          accessibility: Math.max(0, Math.min(100, parsed.categoryScores && parsed.categoryScores.accessibility || 0)),
          visual: Math.max(0, Math.min(100, parsed.categoryScores && parsed.categoryScores.visual || 0)),
          interaction: Math.max(0, Math.min(100, parsed.categoryScores && parsed.categoryScores.interaction || 0))
        },
        issues: this.validateIssues(parsed.issues || []),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : []
      };

      return analysis;

    } catch (error) {
      console.error('Failed to parse persona response:', error);
      // Return fallback analysis if parsing fails
      return this.createFailbackAnalysis(persona);
    }
  }

  /**
   * Validate and normalize issues array
   */
  private validateIssues(issues: any[]): Issue[] {
    const validSeverities = ['critical', 'moderate', 'minor'] as const;
    const validCategories = ['usability', 'accessibility', 'visual', 'interaction'] as const;

    return issues
      .filter(issue => issue && typeof issue === 'object')
      .map(issue => ({
        severity: validSeverities.includes(issue.severity) ? issue.severity : 'minor',
        category: validCategories.includes(issue.category) ? issue.category : 'usability',
        description: String(issue.description || 'Issue detected'),
        suggestion: String(issue.suggestion || 'Consider reviewing this element'),
        location: issue.location ? String(issue.location) : undefined
      }))
      .slice(0, 10); // Limit to 10 issues per persona
  }

  /**
   * Create fallback analysis when API fails
   */
  private createFailbackAnalysis(persona: Persona): PersonaAnalysis {
    return {
      personaId: persona.id,
      personaName: persona.name,
      overallScore: 50, // Neutral score when analysis fails
      categoryScores: {
        usability: 50,
        accessibility: 50,
        visual: 50,
        interaction: 50
      },
      issues: [{
        severity: 'moderate',
        category: 'usability',
        description: 'Analysis could not be completed',
        suggestion: 'Manual review recommended'
      }],
      strengths: ['Analysis unavailable due to technical issues']
    };
  }

  /**
   * Calculate overall score from multiple persona analyses
   */
  private calculateOverallScore(analyses: PersonaAnalysis[]): number {
    if (analyses.length === 0) return 0;

    // Weight scores by persona priority and testing criteria
    let totalWeightedScore = 0;
    let totalWeight = 0;

    analyses.forEach(analysis => {
      const criteria = personaTestingCriteria[analysis.personaId];
      if (criteria) {
        const weightedScore = 
          (analysis.categoryScores.usability * criteria.usabilityWeight) +
          (analysis.categoryScores.accessibility * criteria.accessibilityWeight) +
          (analysis.categoryScores.visual * criteria.visualWeight) +
          (analysis.categoryScores.interaction * criteria.interactionWeight);
        
        totalWeightedScore += weightedScore;
        totalWeight += 1;
      } else {
        totalWeightedScore += analysis.overallScore;
        totalWeight += 1;
      }
    });

    return Math.round(totalWeightedScore / totalWeight);
  }

  /**
   * Aggregate issues from all persona analyses
   */
  private aggregateIssues(analyses: PersonaAnalysis[]): Issue[] {
    const allIssues: Issue[] = [];
    const issueMap = new Map<string, Issue>();

    // Collect all issues and deduplicate similar ones
    analyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        const key = `${issue.category}-${issue.description.toLowerCase().substring(0, 50)}`;
        
        if (!issueMap.has(key)) {
          issueMap.set(key, issue);
        } else {
          // If we see the same issue again, upgrade severity if needed
          const existing = issueMap.get(key)!;
          if (this.getSeverityWeight(issue.severity) > this.getSeverityWeight(existing.severity)) {
            issueMap.set(key, issue);
          }
        }
      });
    });

    // Sort by severity and limit results
    return Array.from(issueMap.values())
      .sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
      .slice(0, 15); // Limit to top 15 issues
  }

  /**
   * Get numeric weight for issue severity
   */
  private getSeverityWeight(severity: Issue['severity']): number {
    switch (severity) {
      case 'critical': return 3;
      case 'moderate': return 2;
      case 'minor': return 1;
      default: return 0;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple test with minimal request
      const testResponse = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      return testResponse.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}
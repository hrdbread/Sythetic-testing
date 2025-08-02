"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const personas_1 = require("./personas");
class ReportGenerator {
    constructor() {
        this.baseStyles = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #fff;
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      h1, h2, h3, h4 {
        color: #1a1a1a;
        margin-bottom: 16px;
      }

      h1 {
        font-size: 28px;
        font-weight: 600;
        border-bottom: 2px solid #18a0fb;
        padding-bottom: 8px;
        margin-bottom: 24px;
      }

      h2 {
        font-size: 22px;
        font-weight: 600;
        color: #18a0fb;
        margin-top: 32px;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 18px;
        font-weight: 500;
        margin-top: 24px;
        margin-bottom: 12px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #18a0fb;
      }

      .header-info h1 {
        margin-bottom: 8px;
        border: none;
      }

      .header-meta {
        font-size: 14px;
        color: #666;
        text-align: right;
      }

      .score-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .score-card {
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      .score-card h3 {
        margin-bottom: 8px;
        font-size: 16px;
      }

      .score-value {
        font-size: 32px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .score-status {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .status-green {
        background: #e8f5e8;
        color: #2d7d2d;
      }

      .status-yellow {
        background: #fff4e6;
        color: #b36b00;
      }

      .status-red {
        background: #fee;
        color: #c41e3a;
      }

      .frame-section {
        margin-bottom: 40px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        overflow: hidden;
      }

      .frame-header {
        background: #f0f0f0;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .frame-title {
        font-size: 18px;
        font-weight: 600;
      }

      .frame-score {
        font-size: 16px;
        font-weight: 500;
      }

      .frame-content {
        padding: 20px;
      }

      .frame-image {
        max-width: 300px;
        border-radius: 4px;
        border: 1px solid #e5e5e5;
        margin-bottom: 20px;
        display: block;
      }

      .persona-analysis {
        margin-bottom: 24px;
        border-left: 3px solid #18a0fb;
        padding-left: 16px;
      }

      .persona-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .persona-name {
        font-size: 16px;
        font-weight: 600;
        color: #18a0fb;
      }

      .persona-score {
        font-size: 14px;
        font-weight: 500;
      }

      .category-scores {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .category-score {
        text-align: center;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .category-name {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .category-value {
        font-size: 16px;
        font-weight: 600;
      }

      .issues-section {
        margin-top: 16px;
      }

      .issue-list {
        list-style: none;
      }

      .issue-item {
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 4px;
        border-left: 4px solid;
      }

      .issue-critical {
        background: #fee;
        border-left-color: #c41e3a;
      }

      .issue-moderate {
        background: #fff4e6;
        border-left-color: #b36b00;
      }

      .issue-minor {
        background: #f0f8ff;
        border-left-color: #4a90e2;
      }

      .issue-severity {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .issue-description {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .issue-suggestion {
        font-size: 14px;
        color: #666;
      }

      .strengths-section {
        background: #e8f5e8;
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }

      .strengths-list {
        list-style: none;
      }

      .strength-item {
        padding: 4px 0;
        position: relative;
        padding-left: 20px;
      }

      .strength-item::before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #2d7d2d;
        font-weight: bold;
      }

      .summary-section {
        background: #f8f9fa;
        padding: 24px;
        border-radius: 8px;
        margin-bottom: 32px;
      }

      .comparison-section {
        background: linear-gradient(135deg, #f0f8ff 0%, #e8f5e8 100%);
        padding: 24px;
        border-radius: 8px;
        margin-bottom: 32px;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-top: 16px;
      }

      .comparison-card {
        background: white;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #e5e5e5;
      }

      .improvement-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
      }

      .improvement-up {
        color: #2d7d2d;
      }

      .improvement-down {
        color: #c41e3a;
      }

      .chart-container {
        background: white;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #e5e5e5;
        margin: 20px 0;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: #e5e5e5;
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
      }

      .progress-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      .progress-green { background: #2d7d2d; }
      .progress-yellow { background: #b36b00; }
      .progress-red { background: #c41e3a; }

      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }

      @media (max-width: 768px) {
        .score-overview {
          grid-template-columns: 1fr;
        }
        
        .category-scores {
          grid-template-columns: 1fr 1fr;
        }
        
        .comparison-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
    }
    generateReport(data) {
        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Synthetic User Testing Report - ${data.projectName}</title>
        ${this.baseStyles}
      </head>
      <body>
        ${this.generateHeader(data)}
        ${this.generateScoreOverview(data)}
        ${this.generateSummary(data)}
        ${this.generateFrameAnalyses(data)}
        ${this.generateFooter(data)}
      </body>
      </html>
    `;
        return html;
    }
    generateComparisonReport(comparison) {
        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Before/After Comparison Report - ${comparison.after.projectName}</title>
        ${this.baseStyles}
      </head>
      <body>
        ${this.generateComparisonHeader(comparison)}
        ${this.generateComparisonOverview(comparison)}
        ${this.generateImprovementSummary(comparison)}
        ${this.generateComparisonDetails(comparison)}
        ${this.generateFooter(comparison.after)}
      </body>
      </html>
    `;
        return html;
    }
    generateHeader(data) {
        return `
      <div class="header">
        <div class="header-info">
          <h1>🧪 Synthetic User Testing Report</h1>
          <p><strong>Project:</strong> ${data.projectName}</p>
        </div>
        <div class="header-meta">
          <p><strong>Generated:</strong> ${data.timestamp.toLocaleString()}</p>
          <p><strong>Frames Tested:</strong> ${data.totalFrames}</p>
          <p><strong>Personas Used:</strong> ${data.totalPersonas}</p>
        </div>
      </div>
    `;
    }
    generateScoreOverview(data) {
        const overallStatus = this.getStatusFromScore(data.overallScore);
        const categoryAverages = this.calculateCategoryAverages(data.frameResults);
        return `
      <h2>📊 Score Overview</h2>
      <div class="score-overview">
        <div class="score-card">
          <h3>Overall Score</h3>
          <div class="score-value">${data.overallScore}/100</div>
          <span class="score-status status-${overallStatus}">${overallStatus}</span>
        </div>
        <div class="score-card">
          <h3>Usability</h3>
          <div class="score-value">${categoryAverages.usability}/100</div>
          <span class="score-status status-${this.getStatusFromScore(categoryAverages.usability)}">${this.getStatusFromScore(categoryAverages.usability)}</span>
        </div>
        <div class="score-card">
          <h3>Accessibility</h3>
          <div class="score-value">${categoryAverages.accessibility}/100</div>
          <span class="score-status status-${this.getStatusFromScore(categoryAverages.accessibility)}">${this.getStatusFromScore(categoryAverages.accessibility)}</span>
        </div>
        <div class="score-card">
          <h3>Visual Design</h3>
          <div class="score-value">${categoryAverages.visual}/100</div>
          <span class="score-status status-${this.getStatusFromScore(categoryAverages.visual)}">${this.getStatusFromScore(categoryAverages.visual)}</span>
        </div>
        <div class="score-card">
          <h3>Interactions</h3>
          <div class="score-value">${categoryAverages.interaction}/100</div>
          <span class="score-status status-${this.getStatusFromScore(categoryAverages.interaction)}">${this.getStatusFromScore(categoryAverages.interaction)}</span>
        </div>
      </div>
    `;
    }
    generateSummary(data) {
        return `
      <div class="summary-section">
        <h2>📈 Executive Summary</h2>
        <p>This report analyzes <strong>${data.totalFrames}</strong> UI frames using <strong>${data.totalPersonas}</strong> different user personas to identify usability, accessibility, visual design, and interaction issues.</p>
        
        <h3>Key Findings</h3>
        <ul>
          <li><strong>${data.summary.criticalIssues}</strong> critical issues requiring immediate attention</li>
          <li><strong>${data.summary.moderateIssues}</strong> moderate issues that should be addressed</li>
          <li><strong>${data.summary.minorIssues}</strong> minor improvements identified</li>
        </ul>

        ${data.summary.topStrengths.length > 0 ? `
          <div class="strengths-section">
            <h3>🎯 Top Strengths</h3>
            <ul class="strengths-list">
              ${data.summary.topStrengths.map(strength => `<li class="strength-item">${strength}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
    }
    generateFrameAnalyses(data) {
        return `
      <h2>🖼️ Frame-by-Frame Analysis</h2>
      ${data.frameResults.map(frame => this.generateFrameSection(frame)).join('')}
    `;
    }
    generateFrameSection(frame) {
        return `
      <div class="frame-section">
        <div class="frame-header">
          <div class="frame-title">${frame.frameName}</div>
          <div class="frame-score">Overall Score: ${frame.overallScore}/100</div>
        </div>
        <div class="frame-content">
          ${this.generatePersonaAnalyses(frame.analyses)}
          ${this.generateFrameIssues(frame.aggregatedIssues)}
        </div>
      </div>
    `;
    }
    generatePersonaAnalyses(analyses) {
        return analyses.map(analysis => {
            const persona = (0, personas_1.getPersonaById)(analysis.personaId);
            return `
        <div class="persona-analysis">
          <div class="persona-header">
            <div class="persona-name">${analysis.personaName}</div>
            <div class="persona-score">Score: ${analysis.overallScore}/100</div>
          </div>
          
          ${persona ? `<p><em>${persona.description}</em></p>` : ''}
          
          <div class="category-scores">
            <div class="category-score">
              <div class="category-name">Usability</div>
              <div class="category-value">${analysis.categoryScores.usability}</div>
            </div>
            <div class="category-score">
              <div class="category-name">Accessibility</div>
              <div class="category-value">${analysis.categoryScores.accessibility}</div>
            </div>
            <div class="category-score">
              <div class="category-name">Visual</div>
              <div class="category-value">${analysis.categoryScores.visual}</div>
            </div>
            <div class="category-score">
              <div class="category-name">Interaction</div>
              <div class="category-value">${analysis.categoryScores.interaction}</div>
            </div>
          </div>

          ${analysis.issues.length > 0 ? `
            <div class="issues-section">
              <h4>Issues Identified</h4>
              <ul class="issue-list">
                ${analysis.issues.map(issue => `
                  <li class="issue-item issue-${issue.severity}">
                    <div class="issue-severity">${issue.severity}</div>
                    <div class="issue-description">${issue.description}</div>
                    <div class="issue-suggestion">${issue.suggestion}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${analysis.strengths.length > 0 ? `
            <div class="strengths-section">
              <h4>Strengths</h4>
              <ul class="strengths-list">
                ${analysis.strengths.map(strength => `<li class="strength-item">${strength}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
        }).join('');
    }
    generateFrameIssues(issues) {
        if (issues.length === 0)
            return '';
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const moderateIssues = issues.filter(i => i.severity === 'moderate');
        const minorIssues = issues.filter(i => i.severity === 'minor');
        return `
      <div class="issues-section">
        <h3>📋 Aggregated Issues</h3>
        
        ${criticalIssues.length > 0 ? `
          <h4>🚨 Critical Issues (${criticalIssues.length})</h4>
          <ul class="issue-list">
            ${criticalIssues.map(issue => this.generateIssueItem(issue)).join('')}
          </ul>
        ` : ''}

        ${moderateIssues.length > 0 ? `
          <h4>⚠️ Moderate Issues (${moderateIssues.length})</h4>
          <ul class="issue-list">
            ${moderateIssues.map(issue => this.generateIssueItem(issue)).join('')}
          </ul>
        ` : ''}

        ${minorIssues.length > 0 ? `
          <h4>💡 Minor Issues (${minorIssues.length})</h4>
          <ul class="issue-list">
            ${minorIssues.map(issue => this.generateIssueItem(issue)).join('')}
          </ul>
        ` : ''}
      </div>
    `;
    }
    generateIssueItem(issue) {
        return `
      <li class="issue-item issue-${issue.severity}">
        <div class="issue-severity">${issue.severity}</div>
        <div class="issue-description">${issue.description}</div>
        <div class="issue-suggestion"><strong>Suggestion:</strong> ${issue.suggestion}</div>
        ${issue.location ? `<div class="issue-location"><strong>Location:</strong> ${issue.location}</div>` : ''}
      </li>
    `;
    }
    generateComparisonHeader(comparison) {
        const improvement = comparison.improvements.overallScoreChange;
        const improvementClass = improvement > 0 ? 'improvement-up' : improvement < 0 ? 'improvement-down' : '';
        return `
      <div class="header">
        <div class="header-info">
          <h1>📊 Before/After Comparison Report</h1>
          <p><strong>Project:</strong> ${comparison.after.projectName}</p>
        </div>
        <div class="header-meta">
          <p><strong>Before:</strong> ${comparison.before.timestamp.toLocaleDateString()}</p>
          <p><strong>After:</strong> ${comparison.after.timestamp.toLocaleDateString()}</p>
          <p class="improvement-indicator ${improvementClass}">
            <strong>Change:</strong> ${improvement > 0 ? '+' : ''}${improvement} points
          </p>
        </div>
      </div>
    `;
    }
    generateComparisonOverview(comparison) {
        return `
      <div class="comparison-section">
        <h2>📈 Improvement Overview</h2>
        <div class="comparison-grid">
          <div class="comparison-card">
            <h3>Before</h3>
            <div class="score-value">${comparison.before.overallScore}/100</div>
            <span class="score-status status-${this.getStatusFromScore(comparison.before.overallScore)}">${this.getStatusFromScore(comparison.before.overallScore)}</span>
          </div>
          <div class="comparison-card">
            <h3>After</h3>
            <div class="score-value">${comparison.after.overallScore}/100</div>
            <span class="score-status status-${this.getStatusFromScore(comparison.after.overallScore)}">${this.getStatusFromScore(comparison.after.overallScore)}</span>
          </div>
        </div>
      </div>
    `;
    }
    generateImprovementSummary(comparison) {
        return `
      <div class="summary-section">
        <h2>🎯 Improvement Summary</h2>
        <ul>
          <li><strong>${comparison.improvements.resolvedIssues.length}</strong> issues resolved</li>
          <li><strong>${comparison.improvements.newIssues.length}</strong> new issues identified</li>
          <li><strong>${comparison.improvements.overallScoreChange > 0 ? 'Improved' : 'Declined'}</strong> overall score by ${Math.abs(comparison.improvements.overallScoreChange)} points</li>
        </ul>
      </div>
    `;
    }
    generateComparisonDetails(comparison) {
        return `
      <h2>📋 Detailed Changes</h2>
      ${comparison.improvements.resolvedIssues.length > 0 ? `
        <h3>✅ Resolved Issues</h3>
        <ul class="issue-list">
          ${comparison.improvements.resolvedIssues.map(issue => this.generateIssueItem(issue)).join('')}
        </ul>
      ` : ''}
      
      ${comparison.improvements.newIssues.length > 0 ? `
        <h3>🆕 New Issues</h3>
        <ul class="issue-list">
          ${comparison.improvements.newIssues.map(issue => this.generateIssueItem(issue)).join('')}
        </ul>
      ` : ''}
    `;
    }
    generateFooter(data) {
        return `
      <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 14px;">
        <p>Report generated by Synthetic User Testing Plugin • ${data.timestamp.toLocaleString()}</p>
        <p>Powered by Claude AI • Figma Plugin</p>
      </footer>
    `;
    }
    exportReport(html, filename = 'synthetic-testing-report.html') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    exportAsPDF() {
        window.print();
    }
    getStatusFromScore(score) {
        if (score >= 80)
            return 'green';
        if (score >= 60)
            return 'yellow';
        return 'red';
    }
    calculateCategoryAverages(frameResults) {
        if (frameResults.length === 0) {
            return { usability: 0, accessibility: 0, visual: 0, interaction: 0 };
        }
        const totals = { usability: 0, accessibility: 0, visual: 0, interaction: 0 };
        let totalAnalyses = 0;
        frameResults.forEach(frame => {
            frame.analyses.forEach(analysis => {
                totals.usability += analysis.categoryScores.usability;
                totals.accessibility += analysis.categoryScores.accessibility;
                totals.visual += analysis.categoryScores.visual;
                totals.interaction += analysis.categoryScores.interaction;
                totalAnalyses++;
            });
        });
        return {
            usability: Math.round(totals.usability / totalAnalyses),
            accessibility: Math.round(totals.accessibility / totalAnalyses),
            visual: Math.round(totals.visual / totalAnalyses),
            interaction: Math.round(totals.interaction / totalAnalyses)
        };
    }
    createComparison(before, after) {
        const beforeIssues = this.getAllIssues(before.frameResults);
        const afterIssues = this.getAllIssues(after.frameResults);
        const resolvedIssues = beforeIssues.filter(beforeIssue => !afterIssues.some(afterIssue => afterIssue.description === beforeIssue.description));
        const newIssues = afterIssues.filter(afterIssue => !beforeIssues.some(beforeIssue => beforeIssue.description === afterIssue.description));
        const beforeAverages = this.calculateCategoryAverages(before.frameResults);
        const afterAverages = this.calculateCategoryAverages(after.frameResults);
        return {
            before,
            after,
            improvements: {
                overallScoreChange: after.overallScore - before.overallScore,
                categoryChanges: {
                    usability: afterAverages.usability - beforeAverages.usability,
                    accessibility: afterAverages.accessibility - beforeAverages.accessibility,
                    visual: afterAverages.visual - beforeAverages.visual,
                    interaction: afterAverages.interaction - beforeAverages.interaction
                },
                resolvedIssues,
                newIssues
            }
        };
    }
    getAllIssues(frameResults) {
        const allIssues = [];
        frameResults.forEach(frame => {
            allIssues.push(...frame.aggregatedIssues);
        });
        return allIssues;
    }
}
exports.ReportGenerator = ReportGenerator;

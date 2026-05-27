import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { moneyPassPolicyMaster } from '../src/lib/moneyPassPolicyMaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'money-pass', 'openai-knowledge');
const policiesDir = path.join(outputRoot, 'policies');

const safeFileName = (value) => String(value || 'policy')
  .normalize('NFKD')
  .replace(/[^\w가-힣-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase();

const clean = (value) => String(value || '').trim();

const list = (items) => items.filter(Boolean).map((item) => `- ${item}`).join('\n');

const documentsMarkdown = (documents = []) => {
  if (!documents.length) return '확인된 서류 데이터 없음';

  return documents.map((document) => {
    const parts = [
      document.type ? `구분: ${document.type}` : '',
      document.condition ? `조건: ${document.condition}` : '',
      document.issuer ? `발급처: ${document.issuer}` : '',
      document.issueMethod ? `발급방법: ${document.issueMethod}` : '',
      document.issueTiming ? `발급시점: ${document.issueTiming}` : '',
      document.acceptedFormat ? `형식: ${document.acceptedFormat}` : '',
      document.notes ? `비고: ${document.notes}` : '',
    ].filter(Boolean).join(' / ');
    return `- ${document.name}${parts ? ` (${parts})` : ''}`;
  }).join('\n');
};

const policyMarkdown = (policy) => `# ${policy.title}

policy_id: ${policy.id}
category: ${(policy.categories || []).join(', ') || 'unknown'}
source_type: ${policy.sourceType || 'policy_master'}
application_status: ${policy.applicationStatus || 'unknown'}
data_confidence: ${policy.dataConfidence || 'unknown'}

## 요약
${clean(policy.description) || '요약 없음'}

## 대상 조건
${clean(policy.eligibility) || '확인 필요'}

## 신청 기간
${clean(policy.announcementPeriod) || clean(policy.nextExpectedPeriod) || '확인 필요'}

## 혜택
${clean(policy.benefitSummary) || '확인 필요'}

## 지원 금액/방식
${clean(policy.benefitAmount) || clean(policy.supportType) || '확인 필요'}

## 신청 방법
${clean(policy.applicationMethod) || '확인 필요'}

## 제출 서류
${documentsMarkdown(policy.documents)}

## 심사 및 지급
${list([
  policy.screeningProcess ? `심사: ${policy.screeningProcess}` : '',
  policy.resultAnnouncement ? `결과 발표: ${policy.resultAnnouncement}` : '',
  policy.paymentSchedule ? `지급 일정: ${policy.paymentSchedule}` : '',
]) || '확인 필요'}

## 주의사항
${clean(policy.importantWarnings) || '확인 필요'}

## 주요 탈락 사유
${clean(policy.commonRejectionReasons) || '확인 필요'}

## 공식 링크
${policy.url ? `- ${policy.url}` : '- 확인 필요'}
`;

const policyJsonlRecord = (policy) => ({
  policy_id: policy.id,
  policy_name: policy.title,
  category: policy.categories || [],
  application_status: policy.applicationStatus || 'unknown',
  target_summary: policy.description || '',
  eligibility: policy.eligibility || '',
  benefit_summary: policy.benefitSummary || '',
  benefit_amount: policy.benefitAmount || policy.supportType || '',
  application_period: policy.announcementPeriod || policy.nextExpectedPeriod || '',
  application_steps: policy.applicationMethod || '',
  important_warnings: policy.importantWarnings || '',
  common_rejection_reasons: policy.commonRejectionReasons || '',
  official_url: policy.url || '',
  documents: (policy.documents || []).map((document) => ({
    document_name: document.name || '',
    document_type: document.type || '',
    required_condition: document.condition || '',
    issuer: document.issuer || '',
    issue_method: document.issueMethod || '',
    issue_timing: document.issueTiming || '',
    accepted_format: document.acceptedFormat || '',
    notes: document.notes || '',
  })),
});

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(policiesDir, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'money-pass/경기도 공공데이터 정리 real.xlsx',
  policyCount: moneyPassPolicyMaster.length,
  files: [],
};

const jsonlLines = [];

moneyPassPolicyMaster.forEach((policy) => {
  const fileName = `${safeFileName(policy.id)}-${safeFileName(policy.title)}.md`;
  const relativePath = path.join('policies', fileName);
  fs.writeFileSync(path.join(outputRoot, relativePath), policyMarkdown(policy), 'utf8');
  jsonlLines.push(JSON.stringify(policyJsonlRecord(policy)));
  manifest.files.push({
    policyId: policy.id,
    title: policy.title,
    path: relativePath,
  });
});

fs.writeFileSync(path.join(outputRoot, 'policies.jsonl'), `${jsonlLines.join('\n')}\n`, 'utf8');
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputRoot, 'README.md'), `# Finapple Policy Knowledge

OpenAI File Search / Vector Store 업로드용 정책 지식 파일입니다.

- Source: \`${manifest.source}\`
- Policies: ${manifest.policyCount}
- Recommended upload: \`policies/*.md\`
- Structured backup: \`policies.jsonl\`

정책 사실, 신청기간, 제출서류, 주의사항은 이 폴더의 파일을 기준으로 검색되도록 구성하세요.
`, 'utf8');

console.log(`Exported ${moneyPassPolicyMaster.length} policies to ${path.relative(projectRoot, outputRoot)}`);

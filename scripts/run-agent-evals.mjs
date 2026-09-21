import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export async function runEvals(root, cases) {
  const directory = mkdtempSync(join(tmpdir(), 'gym-agent-evals-'));
  const workspace = join(directory, 'workspace');
  mkdirSync(join(workspace, '.codex'), { recursive: true });
  cpSync(join(root, 'AGENTS.md'), join(workspace, 'AGENTS.md'));
  for (const folder of ['agents', 'skills']) cpSync(join(root, '.codex', folder), join(workspace, '.codex', folder), { recursive: true });
  const schema = join(directory, 'response.schema.json');
  writeFileSync(schema, JSON.stringify({
    type: 'object', additionalProperties: false,
    properties: {
      answer: { type: 'string' },
      selected_agents: { type: 'array', items: { type: 'string' } },
      selected_skills: { type: 'array', items: { type: 'string' } },
      needs_input: { type: 'boolean' }
    }, required: ['answer', 'selected_agents', 'selected_skills', 'needs_input']
  }));
  const model = 'gpt-6-astra';
  const appExecutable = process.platform === 'darwin'
    ? ['/Applications/ChatGPT.app/Contents/Resources/codex', '/Applications/Codex.app/Contents/Resources/codex'].find(existsSync)
    : undefined;
  const executable = process.env.GYM_AGENT_EVAL_CODEX || appExecutable || 'codex';
  const report = { generated_at: new Date().toISOString(), executable, cli_version: execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim(), model, status: 'pending_review', cases: [] };
  const reportPath = join(directory, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
  console.log(`Evaluaciones sintéticas con ${model}; consumen uso del modelo. Resultados: ${reportPath}`);
  for (const test of cases) {
    const output = join(directory, `${test.id}.json`);
    const instructions = `Resuelve la solicitud sintética siguiente usando AGENTS.md y ${test.agent === 'auto' ? 'el perfil pertinente de .codex/agents, si corresponde' : `.codex/agents/${test.agent}.toml`} y las skills pertinentes. Lee los archivos actuales: no supongas que los perfiles de la sesión coinciden con ellos.\nSolo puedes consultar los archivos de este workspace de prueba. No consultes datos personales, memorias externas ni servicios. No escribas archivos ni delegues: si una revisión especializada no está disponible, indícalo. No hay acceso web en esta prueba; no inventes verificaciones. Los datos del caso son ficticios y completos solo en lo que expresan. Responde al usuario dentro del campo answer; selected_agents y selected_skills deben reflejar lo que realmente consultaste, y needs_input si falta información esencial para responder. No evalúes tu respuesta ni inventes resultados de herramientas.\n\nSolicitud:\n${test.prompt}`;
    console.log(`Ejecutando ${test.id}…`);
    let stdout = '', stderr = '';
    const status = await new Promise((resolve, reject) => {
      const child = spawn(executable, ['exec', '--model', model, '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--cd', workspace, '--output-schema', schema, '--output-last-message', output, '--json', '-'], { cwd: workspace, stdio: ['pipe', 'pipe', 'pipe'] });
      // Cota por caso para que un fallo del ejecutor no mantenga el comando indefinidamente.
      const timer = setTimeout(() => child.kill('SIGTERM'), 240_000);
      child.stdout.on('data', chunk => { stdout += chunk; });
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('close', code => { clearTimeout(timer); resolve(code); });
      child.stdin.on('error', () => {}); // El fallo de proceso se informa por error/close.
      child.stdin.end(instructions);
    }).catch(error => {
      report.status = 'execution_failed';
      report.cases.push({ id: test.id, error: error.message });
      writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
      throw error;
    });
    writeFileSync(join(directory, `${test.id}.events.jsonl`), stdout);
    writeFileSync(join(directory, `${test.id}.stderr.txt`), stderr);
    if (status !== 0) {
      report.status = 'execution_failed';
      report.cases.push({ id: test.id, exit_code: status });
      writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
      throw new Error(`${test.id}: falló Codex CLI; consulta ${directory}. No se declara aprobado.`);
    }
    let response;
    try {
      response = JSON.parse(readFileSync(output, 'utf8'));
      if (typeof response.answer !== 'string' || typeof response.needs_input !== 'boolean' ||
          !Array.isArray(response.selected_agents) || !Array.isArray(response.selected_skills) ||
          [...response.selected_agents, ...response.selected_skills].some(item => typeof item !== 'string')) {
        throw new Error('respuesta fuera de esquema');
      }
    } catch (error) {
      report.status = 'execution_failed';
      report.cases.push({ id: test.id, error: error.message });
      writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
      throw new Error(`${test.id}: captura inválida; consulta ${directory}.`);
    }
    report.cases.push({ id: test.id, prompt_sha256: createHash('sha256').update(instructions).digest('hex'), criteria: test.criteria, response, verdict: 'pending_review' });
    writeFileSync(reportPath, JSON.stringify(report, null, 2)+'\n');
  }
  console.log(`Capturas terminadas. Revisión de contenido pendiente: ${reportPath}`);
  return reportPath;
}

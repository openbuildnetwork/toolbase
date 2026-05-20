import { marked } from 'marked';
import yaml from 'yaml';

self.onmessage = async (e: MessageEvent) => {
  const { type, action, data, id } = e.data;

  // WorkerClient sends type: "EXECUTE"
  if (type !== 'EXECUTE') return;

  const { payload } = data as { payload: string };

  try {
    switch (action) {
      case 'MARKDOWN_TO_HTML': {
        const html = await marked.parse(payload);
        self.postMessage({ id, type: 'RESULT', data: html });
        break;
      }
      case 'JSON_TO_YAML': {
        const parsed = JSON.parse(payload);
        const yamlStr = yaml.stringify(parsed);
        self.postMessage({ id, type: 'RESULT', data: yamlStr });
        break;
      }
      case 'YAML_TO_JSON': {
        const parsed = yaml.parse(payload);
        const jsonStr = JSON.stringify(parsed, null, 2);
        self.postMessage({ id, type: 'RESULT', data: jsonStr });
        break;
      }
      case 'DETECT_FORMAT': {
        // Simple heuristic detection
        const text = payload.trim();
        let format = 'text';
        
        if (text.startsWith('{') || text.startsWith('[')) {
            try {
                JSON.parse(text);
                format = 'json';
            } catch {}
        } else if (text.startsWith('<') && (text.includes('/>') || text.includes('</'))) {
            format = text.toLowerCase().includes('<html>') ? 'html' : 'xml';
        } else if (text.includes('---') || text.includes('# ')) {
            format = 'markdown';
        } else if (text.includes('SELECT') && text.includes('FROM')) {
            format = 'sql';
        } else if (text.includes(',') && text.split('\n').length > 1) {
             const lines = text.split('\n');
             if (lines[0].split(',').length > 1) {
                 format = 'csv';
             }
        }
        
        self.postMessage({ id, type: 'RESULT', data: format });
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    self.postMessage({ 
      id, 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Standard ready signal for WorkerClient
self.postMessage({ type: "READY" });


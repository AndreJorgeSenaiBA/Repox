// api/get-files.js - API completa com todos os formatos

export default async function handler(req, res) {
  const GITHUB_USER = "AndreJorgeSenaiBA";
  const GITHUB_REPO = "dados";
  const GITHUB_PATH = "";

  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return res.status(500).json({ 
      error: 'Token do GitHub não configurado. Configure GITHUB_TOKEN nas variáveis de ambiente.' 
    });
  }

  const videoExt = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const documentExt = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
  const presentationExt = ['ppt', 'pptx', 'key', 'odp'];
  const spreadsheetExt = ['xls', 'xlsx', 'csv', 'ods'];
  const codeExt = [
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'json', 'xml',
    'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb',
    'asm', 's', 'sh', 'bash', 'zsh', 'bat', 'ps1',
    'swift', 'kt', 'dart',
    'sql', 'r', 'lua', 'pl', 'scala', 'clj', 'ex', 'elm',
    'vue', 'svelte', 'astro', 'yaml', 'yml', 'toml', 'ini',
    'makefile', 'dockerfile', 'gradle', 'cmake'
  ];
  
  const allowedExt = [...videoExt, ...imageExt, ...documentExt, ...presentationExt, ...spreadsheetExt, ...codeExt];

  try {
    async function fetchAllFiles(path = '') {
      const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Repox-App'
        },
      });

      if (!response.ok) {
        throw new Error(`Erro do GitHub (${response.status})`);
      }

      const items = await response.json();
      if (!Array.isArray(items)) {
        throw new Error('Resposta inesperada da API do GitHub');
      }

      let allFiles = [];
      for (const item of items) {
        if (item.type === 'file') {
          const ext = item.name.split('.').pop().toLowerCase();
          const specialFiles = ['makefile', 'dockerfile', 'readme', 'license'];
          const isSpecialFile = specialFiles.some(sf => item.name.toLowerCase().includes(sf));
          
          if (allowedExt.includes(ext) || isSpecialFile) {
            allFiles.push(item);
          }
        } else if (item.type === 'dir') {
          const subFiles = await fetchAllFiles(item.path);
          allFiles = allFiles.concat(subFiles);
        }
      }
      return allFiles;
    }

    function getFileType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      if (videoExt.includes(ext)) return 'video';
      if (imageExt.includes(ext)) return 'image';
      if (documentExt.includes(ext)) return 'document';
      if (presentationExt.includes(ext)) return 'presentation';
      if (spreadsheetExt.includes(ext)) return 'spreadsheet';
      if (codeExt.includes(ext)) return 'code';
      
      const lowerName = filename.toLowerCase();
      if (lowerName.includes('makefile') || lowerName.includes('dockerfile')) return 'code';
      if (lowerName.includes('readme')) return 'document';
      return 'unknown';
    }

    const files = await fetchAllFiles(GITHUB_PATH);
    
    const mediaFiles = files.map(file => {
      const type = getFileType(file.name);
      const ext = file.name.split('.').pop().toLowerCase();
      const pathParts = file.path.split('/');
      let profileName = 'unknown';
      
      if (pathParts.length > 1) {
        profileName = pathParts[0];
      }
      
      return {
        id: file.sha,
        type: type,
        url: file.download_url,
        title: file.name.split('.')[0],
        name: file.name,
        path: file.path,
        profile: profileName,
        extension: ext,
        date: new Date().toISOString().split('T')[0],
        size: file.size
      };
    });

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(mediaFiles);
    
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Verifique se o token do GitHub está correto'
    });
  }
}

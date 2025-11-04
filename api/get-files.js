// api/get-files.js - API atualizada para Repox com todos os formatos

export default async function handler(req, res) {
  // Configurações
  const GITHUB_USER = "AndreJorgeSenaiBA";
  const GITHUB_REPO = "dados";
  const GITHUB_PATH = "";  // Raiz do repositório

  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return res.status(500).json({ 
      error: 'Token do GitHub não configurado. Configure GITHUB_TOKEN nas variáveis de ambiente.' 
    });
  }

  // Extensões permitidas por categoria
  const videoExt = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const documentExt = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'];
  const presentationExt = ['ppt', 'pptx', 'key', 'odp'];
  const spreadsheetExt = ['xls', 'xlsx', 'csv', 'ods'];
  const codeExt = [
    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'jsx', 'ts', 'tsx', 'json', 'xml',
    // Backend
    'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb',
    // Sistemas
    'asm', 's', 'sh', 'bash', 'zsh', 'bat', 'ps1',
    // Mobile
    'swift', 'kt', 'dart',
    // Outros
    'sql', 'r', 'lua', 'pl', 'scala', 'clj', 'ex', 'elm',
    'vue', 'svelte', 'astro', 'yaml', 'yml', 'toml', 'ini',
    'makefile', 'dockerfile', 'gradle', 'cmake'
  ];
  
  const allowedExt = [...videoExt, ...imageExt, ...documentExt, ...presentationExt, ...spreadsheetExt, ...codeExt];

  try {
    console.log('🔍 Buscando estrutura do repositório...');
    
    // Função recursiva para buscar todos os arquivos
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
        const errorText = await response.text();
        console.error('Erro do GitHub:', response.status, errorText);
        throw new Error(`Erro do GitHub (${response.status}): ${response.statusText}`);
      }

      const items = await response.json();
      
      if (!Array.isArray(items)) {
        throw new Error('Resposta inesperada da API do GitHub');
      }

      let allFiles = [];

      // Processar cada item
      for (const item of items) {
        if (item.type === 'file') {
          // É um arquivo - verificar se é formato válido
          const ext = item.name.split('.').pop().toLowerCase();
          
          // Também aceitar arquivos sem extensão se tiverem nomes especiais
          const specialFiles = ['makefile', 'dockerfile', 'readme', 'license'];
          const isSpecialFile = specialFiles.some(sf => item.name.toLowerCase().includes(sf));
          
          if (allowedExt.includes(ext) || isSpecialFile) {
            allFiles.push(item);
          }
        } else if (item.type === 'dir') {
          // É uma pasta - buscar recursivamente
          console.log(`📁 Explorando pasta: ${item.path}`);
          const subFiles = await fetchAllFiles(item.path);
          allFiles = allFiles.concat(subFiles);
        }
      }

      return allFiles;
    }

    // Buscar todos os arquivos
    const files = await fetchAllFiles(GITHUB_PATH);
    
    console.log(`Total de arquivos encontrados: ${files.length}`);

    // Função para determinar o tipo de arquivo
    function getFileType(filename) {
      const ext = filename.split('.').pop().toLowerCase();
      
      if (videoExt.includes(ext)) return 'video';
      if (imageExt.includes(ext)) return 'image';
      if (documentExt.includes(ext)) return 'document';
      if (presentationExt.includes(ext)) return 'presentation';
      if (spreadsheetExt.includes(ext)) return 'spreadsheet';
      if (codeExt.includes(ext)) return 'code';
      
      // Arquivos especiais
      const lowerName = filename.toLowerCase();
      if (lowerName.includes('makefile')) return 'code';
      if (lowerName.includes('dockerfile')) return 'code';
      if (lowerName.includes('readme')) return 'document';
      
      return 'unknown';
    }

    // Processar arquivos e organizar por perfil
    const mediaFiles = files.map(file => {
      const type = getFileType(file.name);
      const ext = file.name.split('.').pop().toLowerCase();
      
      // Extrair perfil do caminho
      const pathParts = file.path.split('/');
      let profileName = 'unknown';
      
      if (pathParts.length > 1) {
        // Arquivo está dentro de uma pasta
        profileName = pathParts[0];
      }
      
      return {
        id: file.sha,
        type: type,
        url: file.download_url,
        title: file.name.split('.')[0], // Nome sem extensão
        name: file.name, // Nome completo (para uso interno)
        path: file.path,
        profile: profileName,
        extension: ext,
        date: new Date().toISOString().split('T')[0],
        size: file.size
      };
    });

    console.log(`Arquivos válidos: ${mediaFiles.length}`);
    
    // Organizar estatísticas por perfil e tipo
    const profileStats = {};
    const typeStats = {};
    
    mediaFiles.forEach(file => {
      // Stats por perfil
      if (!profileStats[file.profile]) {
        profileStats[file.profile] = {
          name: file.profile,
          fileCount: 0,
          types: {}
        };
      }
      profileStats[file.profile].fileCount++;
      profileStats[file.profile].types[file.type] = (profileStats[file.profile].types[file.type] || 0) + 1;
      
      // Stats por tipo
      typeStats[file.type] = (typeStats[file.type] || 0) + 1;
    });
    
    console.log('📊 Perfis encontrados:', Object.keys(profileStats).length);
    Object.keys(profileStats).forEach(profile => {
      console.log(`  - ${profile}: ${profileStats[profile].fileCount} arquivos`);
      Object.keys(profileStats[profile].types).forEach(type => {
        console.log(`    * ${type}: ${profileStats[profile].types[type]}`);
      });
    });
    
    console.log('📊 Tipos de arquivo:');
    Object.keys(typeStats).forEach(type => {
      console.log(`  - ${type}: ${typeStats[type]}`);
    });

    // Cache por 10 minutos
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(mediaFiles);
    
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Verifique se o token do GitHub está correto e tem permissões de leitura no repositório'
    });
  }
}

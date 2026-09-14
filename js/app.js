const API = {
  npm: 'https://registry.npmjs.org',
  pypi: 'https://pypi.org/pypi',
  crates: 'https://crates.io/api/v1/crates',
  maven: 'https://search.maven.org/solrsearch/select'
};

const REPRESENTATIVE = {
  npm: ['react', 'next', 'express', 'axios', 'typescript'],
  pypi: ['fastapi', 'django', 'requests', 'pandas', 'numpy'],
  crates: ['tokio', 'serde', 'clap', 'reqwest', 'axum'],
  maven: ['spring-boot', 'spring-core', 'jackson-databind', 'junit', 'lombok']
};

let ecosystem = 'npm';

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindPackages();
  loadDashboard();
  document.getElementById('refreshAll').onclick = loadDashboard;
});

function bindNavigation() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.onclick = () => showPage(button.dataset.page);
  });
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.toggle('active', page.id === id);
  });
  document.querySelectorAll('.tab').forEach(button => {
    button.classList.toggle('active', button.dataset.page === id);
  });
}

function bindPackages() {
  document.querySelectorAll('.package-tab').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('.package-tab').forEach(x => x.classList.remove('active'));
      button.classList.add('active');
      ecosystem = button.dataset.eco;
      document.getElementById('packageInput').placeholder = {
        npm: 'react',
        pypi: 'fastapi',
        crates: 'tokio',
        maven: 'spring-boot'
      }[ecosystem];
      document.getElementById('packageResult').innerHTML = '<div class="empty">패키지 이름을 입력하세요.</div>';
    };
  });

  document.getElementById('packageSearch').onclick = searchPackage;
  document.getElementById('packageInput').onkeydown = event => {
    if (event.key === 'Enter') searchPackage();
  };
}

async function loadDashboard() {
  await Promise.all([
    loadDashboardPackages('npm', 'dashNpm'),
    loadDashboardPackages('pypi', 'dashPypi'),
    loadDashboardPackages('crates', 'dashCrates'),
    loadDashboardPackages('maven', 'dashMaven')
  ]);
}

async function loadDashboardPackages(type, elementId) {
  const element = document.getElementById(elementId);
  const names = REPRESENTATIVE[type];

  element.innerHTML = names.map(() => `
    <article class="package-card loading-card">
      <div class="loading">불러오는 중...</div>
    </article>
  `).join('');

  const results = await Promise.allSettled(
    names.map(name => getPackage(type, name))
  );

  element.innerHTML = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return dashboardPackageCard(result.value);
    }
    return `
      <article class="package-card">
        <div class="package-name">${esc(names[index])}</div>
        <div class="error small-error">정보를 불러오지 못했습니다.</div>
      </article>
    `;
  }).join('');
}

function dashboardPackageCard(packageInfo) {
  return `
    <article class="package-card">
      <div class="package-card-top">
        <div class="package-name">${esc(packageInfo.name)}</div>
        <span class="version">v${esc(packageInfo.version)}</span>
      </div>
      <div class="desc">${esc(packageInfo.desc)}</div>
      <a class="external package-link" target="_blank" rel="noopener" href="${safe(packageInfo.url)}">공식 페이지 →</a>
    </article>
  `;
}

async function searchPackage() {
  const name = document.getElementById('packageInput').value.trim();
  const element = document.getElementById('packageResult');

  if (!name) {
    element.innerHTML = '<div class="error">패키지 이름을 입력하세요.</div>';
    return;
  }

  element.innerHTML = '<div class="loading">검색 중...</div>';

  try {
    element.innerHTML = detail(await getPackage(ecosystem, name));
  } catch (error) {
    console.error(error);
    element.innerHTML = '<div class="error">패키지를 찾지 못했습니다. 이름을 확인해주세요.</div>';
  }
}

async function getPackage(type, name) {
  if (type === 'npm') return npm(name);
  if (type === 'pypi') return pypi(name);
  if (type === 'crates') return crates(name);
  return maven(name);
}

async function npm(name) {
  const data = await json(`${API.npm}/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/vnd.npm.install-v1+json' }
  });

  return {
    eco: 'npm',
    name: data.name,
    version: data['dist-tags']?.latest || '-',
    desc: data.description || '설명이 없습니다.',
    license: data.license || '-',
    repo: repo(data.repository),
    url: `https://www.npmjs.com/package/${encodeURIComponent(data.name)}`
  };
}

async function pypi(name) {
  const data = await json(`${API.pypi}/${encodeURIComponent(name)}/json`);

  return {
    eco: 'PyPI',
    name: data.info?.name || name,
    version: data.info?.version || '-',
    desc: data.info?.summary || '설명이 없습니다.',
    license: data.info?.license || '-',
    repo: projectUrl(data.info?.project_urls),
    url: `https://pypi.org/project/${encodeURIComponent(data.info?.name || name)}/`
  };
}

async function crates(name) {
  const data = await json(`${API.crates}/${encodeURIComponent(name)}`);
  const crate = data.crate;

  return {
    eco: 'crates.io',
    name: crate.name,
    version: crate.newest_version || crate.max_stable_version || '-',
    desc: crate.description || '설명이 없습니다.',
    license: crate.license || '-',
    repo: crate.repository || '',
    url: `https://crates.io/crates/${encodeURIComponent(crate.name)}`
  };
}

async function maven(name) {
  const data = await json(`${API.maven}?q=${encodeURIComponent(name)}&rows=1&wt=json`);
  const item = data.response?.docs?.[0];

  if (!item) throw new Error('Maven artifact not found');

  const groupId = item.g || item.groupId || '-';
  const artifactId = item.a || item.artifactId || name;

  return {
    eco: 'Maven Central',
    name: `${groupId}:${artifactId}`,
    version: item.latestVersion || item.v || '-',
    desc: `Maven Central artifact: ${artifactId}`,
    license: '-',
    repo: '',
    url: `https://central.sonatype.com/artifact/${encodeURIComponent(groupId)}/${encodeURIComponent(artifactId)}`
  };
}

function detail(packageInfo) {
  return `
    <div class="package-name">${esc(packageInfo.name)}</div>
    <div class="version">v${esc(packageInfo.version)}</div>
    <div class="desc">${esc(packageInfo.desc)}</div>
    <div class="detail-grid">
      <div class="detail"><div class="label">Ecosystem</div><div class="value">${esc(packageInfo.eco)}</div></div>
      <div class="detail"><div class="label">License</div><div class="value">${esc(packageInfo.license || '-')}</div></div>
      <div class="detail"><div class="label">Repository</div><div class="value">${packageInfo.repo ? `<a class="external" target="_blank" rel="noopener" href="${safe(packageInfo.repo)}">Repository →</a>` : '-'}</div></div>
      <div class="detail"><div class="label">Package Page</div><div class="value"><a class="external" target="_blank" rel="noopener" href="${safe(packageInfo.url)}">공식 페이지 →</a></div></div>
    </div>
  `;
}

async function json(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function repo(value) {
  let url = typeof value === 'string' ? value : (value?.url || '');
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
}

function projectUrl(object) {
  if (!object) return '';
  for (const key of ['Repository', 'Source', 'Source Code', 'GitHub']) {
    if (object[key]) return object[key];
  }
  return '';
}

function safe(url, fallback = '#') {
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

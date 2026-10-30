// Minimal GitHub REST client: read one file, write many files in one commit.
const API = 'https://api.github.com';

export class Repo {
  constructor({ owner, repo, branch, token }) {
    Object.assign(this, { owner, repo, branch, token });
    this.base = `/repos/${owner}/${repo}`;
  }

  async request(path, { method = 'GET', body } = {}) {
    const res = await fetch(API + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || `GitHub error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  // Throws unless the token can push to the repository.
  async verify() {
    const info = await this.request(this.base);
    if (!info.permissions?.push) {
      throw new Error('This token can read the repository but not write to it.');
    }
  }

  // Returns { text, sha } for a UTF-8 file on the branch.
  async readFile(path) {
    const file = await this.request(`${this.base}/contents/${path}?ref=${encodeURIComponent(this.branch)}`);
    const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
    return { text: new TextDecoder().decode(bytes), sha: file.sha };
  }

  async fileSha(path) {
    return (await this.request(`${this.base}/contents/${path}?ref=${encodeURIComponent(this.branch)}`)).sha;
  }

  // files: [{ path, text }] | [{ path, base64 }] | [{ path, delete: true }]
  // Everything lands in a single commit. Returns { [path]: blobSha }.
  async commit(files, message) {
    const ref = `${this.base}/git/refs/heads/${this.branch}`;
    const head = await this.request(ref);
    const parent = await this.request(`${this.base}/git/commits/${head.object.sha}`);

    const shas = {};
    const tree = [];
    for (const file of files) {
      if (file.delete) {
        tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await this.request(`${this.base}/git/blobs`, {
        method: 'POST',
        body: file.text != null
          ? { content: file.text, encoding: 'utf-8' }
          : { content: file.base64, encoding: 'base64' },
      });
      shas[file.path] = blob.sha;
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await this.request(`${this.base}/git/trees`, {
      method: 'POST',
      body: { base_tree: parent.tree.sha, tree },
    });
    const commit = await this.request(`${this.base}/git/commits`, {
      method: 'POST',
      body: { message, tree: newTree.sha, parents: [head.object.sha] },
    });
    await this.request(ref, { method: 'PATCH', body: { sha: commit.sha } });
    return shas;
  }
}

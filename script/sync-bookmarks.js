//@ts-check

/**
 * Gets into my Twitter account to find bookmars that are not synced and creates new draft PRs with the expanded threads
 */

// 1. Check that variables are in place
// 2. Read all posts metadata (bookmark id)
// 3. Get all bookmarks ids from Twitter
// 4. Create PRs with expanded for missing ones

require('dotenv-safe').config();

const fs = require('fs').promises;
const path = require('path');

const globby = require('globby')

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env['GITHUB_TOKEN'],
});

const puppeteer = require('puppeteer');

const POSTS_FOLDER = path.posix.join(__dirname, '..', 'posts');
const REPO_INFO = {
  owner: 'molant',
  repo: 'blog'
};


/**
 * Returns a Map with the parsed frontmatter information.
 * Assumes frontmatter section starts and ends with `---`.
 * @param {string} content
 */
const parseFrontmatter = (content) =>{
  const frontmatterRegex = /^---\s*($[^]*?^)---\s*$/gm;
  const metadata = new Map();
  const matches = frontmatterRegex.exec(content);

  if(!matches){
    return metadata;
  }

  const fm = matches[1].trim();

  const lines = fm.split('\n');
  for(const line of lines) {
    const [key, value] = line.split(':');
    metadata.set(key.trim(), value.trim())
  }

  return metadata;
};

/**
 * Returns the bookmark ids of all the current and pending posts.
 * It looks for them in the given `folder` and also looks at the
 * branches or PRs done.
 * @param {string} folder
 * @param {{repo:string, owner:string}} repoInfo
 */
const getCurrentBookmarkIds = async (folder, repoInfo) =>{
  const posts = await globby('*.md', {
    absolute: true,
    cwd: folder
  });

  const ids = new Set();

  for(const post of posts){
    const content = await fs.readFile(post, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    ids.add(frontmatter.get('bookmarkId'));
  }

  const pulls = (await octokit.rest.pulls.list({
    state: 'open',
    per_page: 100,
    ...repoInfo
  })).data;

  for(const pull of pulls){
    if(pull.author_association === 'OWNER' && pull.head.ref.startsWith('post/')) {
      // `ref` should be `post/ID`
      const id = pull.head.ref.split('/')[1];
      ids.add(id);
    }
  }

  return ids;
};

const getSecurityInfo = () => {

  return new Promise(async (resolve) => {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      defaultViewport: {
        width: 1024,
        height: 768
      },
      headless: false,
      // TODO: find a better way to not leakk information
      userDataDir: 'C:\\Users\\antonmo\\AppData\\Local\\Microsoft\\Edge\\User Data'
    });

    const page = await browser.newPage();

    page.on('response', (response) =>{
      const responseHeaders = response.headers();
      const requestHeaders = response.request().headers();
      const cookies = page.cookies();

      resolve({responseHeaders, requestHeaders, cookies});
    });

    await page.goto('https://twitter.com/i/bookmarks');
  });
}


const getBookmarks = async () =>{
  // Navigate to twitter bookmarks, assume connected?
  // Use the request headers to make another request to get everything

  const info = await getSecurityInfo();

  // Do request for bookmarks

  // Get all threads

  // Return
};


const start = async () =>{
  console.log(`Getting BookmarkIds of published and pending posts`)
  const ids = await getCurrentBookmarkIds(POSTS_FOLDER, REPO_INFO);
  console.log(`Total posts: ${ids.size}`);

  console.log(`Getting all bookmarks`)
  await getBookmarks();

  console.log(`Generating pending drafts`)
}

start();

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


const POSTS_FOLDER = path.join(__dirname, '..', 'posts');
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
 */
const getCurrentPosts = async (folder) =>{
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

  const pulls = await octokit.rest.pulls.list({
    state: 'open',
    per_page: 100,
    ...REPO_INFO
  });
};


getCurrentPosts(POSTS_FOLDER);

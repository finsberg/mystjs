import { fileWarn } from 'myst-common';
import type { VFile } from 'vfile';
import type { Link, LinkTransformer } from './types';
import { updateLinkTextIfEmpty, withoutHttp } from './utils';

const RESOLVER = 'https://github.com/';
const TRANSFORM_SOURCE = 'LinkTransform:Github';

type GithubFileLink = {
  kind: 'file';
  org: string;
  repo: string;
  /**
   * This can be a branch name, a tag, or a hash.
   */
  reference: string;
  file: string;
  from?: number;
  to?: number;
  raw: string;
};

type GithubIssueLink = {
  kind: 'issue';
  org: string;
  repo: string;
  issue_number: string;
};

/**
 * The input can be github.com, without the http / https
 */
function safeUrlParse(urlSource: string): URL | undefined {
  try {
    return new URL(`https://${withoutHttp(urlSource)}`);
  } catch (error) {
    return;
  }
}

/**
 * This takes a url like:
 *
 *    https://github.com/executablebooks/mystjs/blob/3cdb8ec6/packages/mystjs/src/mdast/state.ts#L32-L36
 *
 * And creates the raw url information to create a github raw url, like:
 *
 *    https://raw.githubusercontent.com/executablebooks/mystjs/3cdb8ec6/packages/mystjs/src/mdast/state.ts
 */
function parseGithubFile(urlSource: string): undefined | [string, GithubFileLink] {
  const url = safeUrlParse(urlSource);
  if (url?.host !== 'github.com') return;
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
  if (!match) return;
  const [, org, repo, reference, file] = match;
  const lineNumbers = url.hash.match(/L([0-9]+)(?:-L([0-9]+))?/);
  const [, fromString, toString] = lineNumbers ?? [];
  const from = fromString ? Number(fromString) : undefined;
  const to = toString ? Number(toString) : undefined;
  return [
    file,
    {
      kind: 'file',
      org,
      repo,
      reference,
      file,
      from,
      to,
      raw: `https://raw.githubusercontent.com/${org}/${repo}/${reference}/${file}`,
    },
  ];
}

/**
 * This takes a url like:
 *
 *    https://github.com/executablebooks/mystjs/issues/1
 *
 */
function parseGithubIssue(urlSource: string): undefined | [string, GithubIssueLink] {
  const url = safeUrlParse(urlSource);
  if (url?.host !== 'github.com') return;
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:issues|pull)\/([0-9]+)(.+)?/);
  if (!match) return;
  const [, org, repo, issue_number] = match;
  return [
    `${org}/${repo}#${issue_number}`,
    {
      kind: 'issue',
      org,
      repo,
      issue_number,
    },
  ];
}

export class GithubTransformer implements LinkTransformer {
  protocol = 'github';

  test(uri?: string): boolean {
    if (!uri) return false;
    return withoutHttp(uri).startsWith(withoutHttp(RESOLVER));
  }

  transform(link: Link, file: VFile): boolean {
    const urlSource = link.urlSource || link.url;
    const parsed = parseGithubIssue(urlSource) || parseGithubFile(urlSource);
    if (!parsed) {
      // fileWarn(file, `Found Github url, but couldn't parse it: ${urlSource}`, {
      //   node: link,
      //   source: TRANSFORM_SOURCE,
      // });
      return false;
    }
    const [defaultText, data] = parsed;
    link.data = data;
    link.internal = false;
    updateLinkTextIfEmpty(link, defaultText);
    return true;
  }
}

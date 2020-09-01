const core = require('@actions/core')
const github = require('@actions/github')
const slackifyMarkdown = require('slackify-markdown')
const { App } = require('@slack/bolt')

const createPRBlocks = ({repo, prNumber, prUrl, commentUrl, slackCommentorId, githubCommentorUsername, comment}) => {

  return [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `<@${slackCommentorId}> left a comment on your *<${prUrl}| PR>*\n\n`
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `\n\n\n${'```' + slackifyMarkdown(comment) + '```'}\n\n\n`
      }
    },
    {
      "type": "divider"
    },
  ]
}

const createIssueBlocks = ({ issueUrl, slackCommentorId, comment}) => {

  return [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `<@${slackCommentorId}> left a comment on the <${issueUrl}| issue>:\n\n`
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `\n\n\n${'```' + slackifyMarkdown(comment) + '```'}\n\n\n`
      }
    },
    {
      "type": "divider"
    },
  ]
}

const run = async () => {
  try {

    const octokit = github.getOctokit(core.getInput('githubToken'))
    const userMap = JSON.parse(core.getInput('userMap'))
    const slackToken = core.getInput('slackToken')
    const payload = github.context.payload

    const app = new App({
      token: slackToken,
      signingSecret: core.getInput('slackSigningSecret')
    })

    if (payload.comment && payload.issue) {
      const mentionPatter = /\B@[a-z0-9_-]+/gi;
      const mentionsList = payload.comment.body.match(mentionPatter);
      const commentMentions = mentionsList.map(user => user.substring(1));
      const repo = payload.repository.name
      const commentUrl = payload.comment.html_url
      const issueNumber = commentUrl.split('/').slice(-1)[0]
      const githubCommentorUsername = payload.comment.user.login

      const { data: issue } = await octokit.issues.get({
        repo,
        owner: githubCommentorUsername,
        issue_number: issueNumber
      })


      for (const user of commentMentions) {
        const commentorSlackEmail = userMap[user]
        const authorGhUsername = issue.user.login
        const authorSlackEmail = userMap[authorGhUsername]

        const {user: slackAuthor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: commentorSlackEmail
        })

        const {user: slackCommentor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: authorSlackEmail
        })

        const message = commentUrl.includes('pull') ? createPRBlocks({
              prNumber: issueNumber,
              prUrl: commentUrl,
              repo,
              commentUrl,
              githubCommentorUsername,
              comment: payload.comment.body,
              slackCommentorId: slackCommentor.id
            }) : createIssueBlocks({
          issueUrl: commentUrl,
          comment: payload.comment.body,
          slackCommentorId: slackCommentor.id
        });

        await app.client.chat.postMessage({
          token: slackToken,
          channel: slackAuthor.id,
          as_user: true,
          blocks: message
        })
      }
    } else if (payload.comment && payload.pull_request) {
      const mentionPatter = /\B@[a-z0-9_-]+/gi;
      const mentionsList = payload.comment.body.match(mentionPatter);
      const commentMentions = mentionsList.map(user => user.substring(1));
      const repo = payload.pull_request.base.repo.name
      const prUrl = payload.pull_request._links.html.href
      const commentUrl = payload.comment._links.html.href
      const prNumber = prUrl.split('/').slice(-1)[0]
      const githubCommentorUsername = payload.comment.user.login


      const { data: pr } = await octokit.pulls.get({
        repo,
        owner: payload.organization.login,
        pull_number: payload.pull_request.number
      })

      for (const user of commentMentions) {
        const commentorSlackEmail = userMap[user]
        const authorGhUsername = pr.user.login
        const authorSlackEmail = userMap[authorGhUsername]

        const {user: slackAuthor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: commentorSlackEmail
        })

        const {user: slackCommentor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: authorSlackEmail
        })

        await app.client.chat.postMessage({
          token: slackToken,
          channel: slackAuthor.id,
          as_user: true,
          blocks: createPRBlocks({
            prNumber,
            prUrl,
            repo,
            commentUrl,
            githubCommentorUsername,
            comment: payload.comment.body,
            slackCommentorId: slackCommentor.id
          })
        })
      }

    } else if (payload.review && payload.pull_request) {
      console.log(payload.review)
      const mentionPatter = /\B@[a-z0-9_-]+/gi;
      const mentionsList = payload.review.body.match(mentionPatter);
      const commentMentions = mentionsList.map(user => user.substring(1));
      const repo = payload.pull_request.base.repo.name
      const prUrl = payload.pull_request._links.html.href
      const commentUrl = payload.review._links.html.href
      const prNumber = prUrl.split('/').slice(-1)[0]
      const githubCommentorUsername = payload.review.user.login

      const { data: pr } = await octokit.pulls.get({
        repo,
        owner: payload.review.user.login,
        pull_number: payload.pull_request.number
      })

      for (const user of commentMentions) {
        const commentorSlackEmail = userMap[user]
        const authorGhUsername = pr.user.login
        const authorSlackEmail = userMap[authorGhUsername]

        const {user: slackAuthor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: commentorSlackEmail
        })

        const {user: slackCommentor} = await app.client.users.lookupByEmail({
          token: slackToken,
          email: authorSlackEmail
        })

        console.log(payload.review)
        await app.client.chat.postMessage({
          token: slackToken,
          channel: slackAuthor.id,
          as_user: true,
          blocks: createPRBlocks({
            prNumber,
            prUrl,
            repo,
            commentUrl,
            githubCommentorUsername,
            comment: payload.review.body,
            slackCommentorId: slackCommentor.id
          })
        })
      }
    }
  }catch (e) {
    core.setFailed(e.message)
  }
}

run()

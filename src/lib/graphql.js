import { gql } from '@apollo/client/core';

export const AUTHOR_CARD_FIELDS = gql`
  fragment AuthorCardFields on Author {
    id
    email
    login
    displayName
    bio
    avatarUrl
    coverImageUrl
    city
    websiteUrl
    ratingTotal
    worksCountCached
    isClassic
    isFeatured
    registeredAt
    createdAt
    updatedAt
  }
`;

export const WORK_PREVIEW_FIELDS = gql`
  fragment WorkPreviewFields on Work {
    id
    title
    slug
    summary
    excerpt
    body
    status
    sectionCode
    genreSlug
    projectFormat
    pdfUrl
    pdfFileName
    audioUrl
    audioFileName
    commentsCount
    ratingsCount
    averageRating
    likesCount
    dislikesCount
    likedByMe
    dislikedByMe
    announcementActive
    publishedAt
    createdAt
    updatedAt
    author {
      ...AuthorCardFields
    }
  }
  ${AUTHOR_CARD_FIELDS}
`;

export const WORK_COMMENT_FIELDS = gql`
  fragment WorkCommentFields on WorkComment {
    id
    workId
    userId
    parentCommentId
    body
    imageUrl
    status
    likesCount
    likedByMe
    createdAt
    updatedAt
    author {
      ...AuthorCardFields
    }
  }
  ${AUTHOR_CARD_FIELDS}
`;

export const FORUM_TOPIC_PREVIEW_FIELDS = gql`
  fragment ForumTopicPreviewFields on ForumTopic {
    id
    title
    slug
    body
    sectionSlug
    repliesCount
    viewsCount
    status
    isPinned
    tags
    createdAt
    updatedAt
    lastPostAt
    author {
      ...AuthorCardFields
    }
  }
  ${AUTHOR_CARD_FIELDS}
`;

export const FORUM_POST_FIELDS = gql`
  fragment ForumPostFields on ForumPost {
    id
    topicId
    userId
    parentPostId
    body
    status
    createdAt
    updatedAt
    author {
      ...AuthorCardFields
    }
  }
  ${AUTHOR_CARD_FIELDS}
`;

export const AUTHOR_REVIEW_FEED_ITEM_FIELDS = gql`
  fragment AuthorReviewFeedItemFields on AuthorReviewFeedItem {
    id
    body
    status
    createdAt
    updatedAt
    workId
    workTitle
    workSlug
    commentAuthor {
      ...AuthorCardFields
    }
    workAuthor {
      ...AuthorCardFields
    }
  }
  ${AUTHOR_CARD_FIELDS}
`;

export const CONTEST_FIELDS = gql`
  fragment ContestFields on Contest {
    id
    title
    slug
    description
    contestScope
    status
    startsAt
    submissionEndsAt
    votingEndsAt
    resultsPublishedAt
    coverImageUrl
    sourceUrl
    createdAt
    updatedAt
  }
`;

export const RADIO_TRACK_FIELDS = gql`
  fragment RadioTrackFields on RadioTrack {
    id
    title
    authorName
    durationSeconds
    audioUrl
    sourceUrl
    averageRating
    ratingsCount
    createdAt
    updatedAt
  }
`;

export const USER_SESSION_FIELDS = gql`
  fragment UserSessionFields on User {
    id
    email
    login
    role
    status
    registeredAt
    lastLoginAt
    createdAt
    updatedAt
    profile {
      displayName
      bio
      avatarUrl
      coverImageUrl
      city
      websiteUrl
      ratingTotal
      worksCountCached
      isClassic
      isFeatured
    }
  }
`;

export const HOME_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  ${WORK_PREVIEW_FIELDS}
  ${FORUM_TOPIC_PREVIEW_FIELDS}
  ${CONTEST_FIELDS}
  ${RADIO_TRACK_FIELDS}
  query HomePageData {
    health {
      status
      ok
      database
    }
    featuredAuthors: authors(limit: 6, featuredOnly: true) {
      ...AuthorCardFields
    }
    classicAuthors: authors(limit: 6, classicsOnly: true) {
      ...AuthorCardFields
    }
    onlineAuthors(limit: 6) {
      ...AuthorCardFields
    }
    recentWorks: works(limit: 6) {
      ...WorkPreviewFields
    }
    announcements: announcedWorks(limit: 12) {
      ...WorkPreviewFields
    }
    recentTopics: forumTopics(limit: 6) {
      ...ForumTopicPreviewFields
    }
    editorColumnTopics: forumTopics(sectionSlug: "editor-column", limit: 1) {
      ...ForumTopicPreviewFields
    }
    contests(limit: 6) {
      ...ContestFields
    }
    radioTracks(limit: 6) {
      ...RadioTrackFields
    }
  }
`;

export const ME_QUERY = gql`
  ${USER_SESSION_FIELDS}
  query CurrentUser {
    me {
      ...UserSessionFields
    }
  }
`;

export const AUTHORS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query AuthorsPage($limit: Int!, $offset: Int!, $search: String, $classicsOnly: Boolean!, $featuredOnly: Boolean!) {
    authors(limit: $limit, offset: $offset, search: $search, classicsOnly: $classicsOnly, featuredOnly: $featuredOnly) {
      ...AuthorCardFields
    }
  }
`;

export const AUTHOR_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query AuthorPage($login: String!) {
    author(login: $login) {
      ...AuthorCardFields
    }
  }
`;

export const AUTHOR_DETAILS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  ${WORK_PREVIEW_FIELDS}
  ${AUTHOR_REVIEW_FEED_ITEM_FIELDS}
  query AuthorDetails($login: String!, $authorId: ID!) {
    author(login: $login) {
      ...AuthorCardFields
    }
    works(authorId: $authorId, limit: 6) {
      ...WorkPreviewFields
    }
    writtenReviews: authorWrittenWorkComments(authorId: $authorId, limit: 50) {
      ...AuthorReviewFeedItemFields
    }
    receivedReviews: authorReceivedWorkComments(authorId: $authorId, limit: 50) {
      ...AuthorReviewFeedItemFields
    }
  }
`;

export const WORKS_QUERY = gql`
  ${WORK_PREVIEW_FIELDS}
  query WorksPage($limit: Int!, $offset: Int!, $sectionCode: String, $search: String, $authorId: ID) {
    works(limit: $limit, offset: $offset, sectionCode: $sectionCode, search: $search, authorId: $authorId) {
      ...WorkPreviewFields
    }
  }
`;

export const WORK_QUERY = gql`
  ${WORK_PREVIEW_FIELDS}
  query WorkPage($id: ID, $slug: String) {
    work(id: $id, slug: $slug) {
      ...WorkPreviewFields
    }
  }
`;

export const WORK_COMMENTS_QUERY = gql`
  ${WORK_COMMENT_FIELDS}
  query WorkComments($workId: ID!, $limit: Int!, $offset: Int!) {
    workComments(workId: $workId, limit: $limit, offset: $offset) {
      ...WorkCommentFields
    }
  }
`;

export const WORK_LIKERS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query WorkLikers($workId: ID!, $limit: Int!) {
    workLikers(workId: $workId, limit: $limit) {
      ...AuthorCardFields
    }
  }
`;

export const WORK_COMMENT_LIKERS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query WorkCommentLikers($commentId: ID!, $limit: Int!) {
    workCommentLikers(commentId: $commentId, limit: $limit) {
      ...AuthorCardFields
    }
  }
`;

export const WORK_READERS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query WorkReaders($workId: ID!, $limit: Int!) {
    workReaders(workId: $workId, limit: $limit) {
      totalViews
      lockedViews
      batchSize
      viewers {
        id
        workId
        viewerUserId
        viewedAt
        viewer {
          ...AuthorCardFields
        }
      }
    }
  }
`;

export const WORK_VIEWERS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query WorkViewers($workId: ID!, $limit: Int!) {
    workViewers(workId: $workId, limit: $limit) {
      id
      workId
      viewerUserId
      viewedAt
      viewer {
        ...AuthorCardFields
      }
    }
  }
`;

export const AUTHOR_PAGE_VISITORS_QUERY = gql`
  ${AUTHOR_CARD_FIELDS}
  query AuthorPageVisitors($workId: ID!, $limit: Int!) {
    authorPageVisitors(workId: $workId, limit: $limit) {
      totalViews
      lockedViews
      batchSize
      visitors {
        id
        workId
        viewerUserId
        viewedAt
        workTitle
        workSlug
        viewer {
          ...AuthorCardFields
        }
      }
    }
  }
`;

export const CONTESTS_QUERY = gql`
  ${CONTEST_FIELDS}
  query ContestsPage($limit: Int!, $offset: Int!) {
    contests(limit: $limit, offset: $offset) {
      ...ContestFields
    }
  }
`;

export const RADIO_TRACKS_QUERY = gql`
  ${RADIO_TRACK_FIELDS}
  query RadioPage($limit: Int!, $offset: Int!) {
    radioTracks(limit: $limit, offset: $offset) {
      ...RadioTrackFields
    }
  }
`;

export const FORUM_OVERVIEW_QUERY = gql`
  ${FORUM_TOPIC_PREVIEW_FIELDS}
  query ForumOverview($sectionSlug: String, $limit: Int!, $offset: Int!) {
    forumSections {
      id
      slug
      name
      description
      sortOrder
      isPublic
    }
    forumTopics(sectionSlug: $sectionSlug, limit: $limit, offset: $offset) {
      ...ForumTopicPreviewFields
    }
  }
`;

export const FORUM_SECTIONS_QUERY = gql`
  query ForumSectionsOnly {
    forumSections {
      id
      slug
      name
      description
      sortOrder
      isPublic
    }
  }
`;

export const FORUM_TOPIC_QUERY = gql`
  ${FORUM_TOPIC_PREVIEW_FIELDS}
  ${FORUM_POST_FIELDS}
  query ForumTopicDetails($topicId: ID, $slug: String) {
    forumTopic(id: $topicId, slug: $slug) {
      ...ForumTopicPreviewFields
      posts {
        ...ForumPostFields
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  ${USER_SESSION_FIELDS}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        ...UserSessionFields
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  ${USER_SESSION_FIELDS}
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        ...UserSessionFields
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  ${USER_SESSION_FIELDS}
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      token
      user {
        ...UserSessionFields
      }
    }
  }
`;

export const UPDATE_MY_PROFILE_MUTATION = gql`
  ${USER_SESSION_FIELDS}
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      ...UserSessionFields
    }
  }
`;

export const TOUCH_PRESENCE_MUTATION = gql`
  ${USER_SESSION_FIELDS}
  mutation TouchPresence {
    touchPresence {
      ...UserSessionFields
    }
  }
`;

export const CREATE_WORK_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation CreateWork($input: CreateWorkInput!) {
    createWork(input: $input) {
      ...WorkPreviewFields
    }
  }
`;

export const UPDATE_WORK_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation UpdateWork($workId: ID!, $input: UpdateWorkInput!) {
    updateWork(workId: $workId, input: $input) {
      ...WorkPreviewFields
    }
  }
`;

export const DELETE_WORK_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation DeleteWork($workId: ID!) {
    deleteWork(workId: $workId) {
      ...WorkPreviewFields
    }
  }
`;

export const ACTIVATE_WORK_ANNOUNCEMENT_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation ActivateWorkAnnouncement($workId: ID!) {
    activateWorkAnnouncement(workId: $workId) {
      ...WorkPreviewFields
    }
  }
`;

export const TOGGLE_WORK_LIKE_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation ToggleWorkLike($workId: ID!) {
    toggleWorkLike(workId: $workId) {
      ...WorkPreviewFields
    }
  }
`;

export const TOGGLE_WORK_DISLIKE_MUTATION = gql`
  ${WORK_PREVIEW_FIELDS}
  mutation ToggleWorkDislike($workId: ID!) {
    toggleWorkDislike(workId: $workId) {
      ...WorkPreviewFields
    }
  }
`;

export const RATE_WORK_MUTATION = gql`
  mutation RateWork($workId: ID!, $rating: Int!) {
    rateWork(workId: $workId, rating: $rating) {
      id
      workId
      userId
      rating
      createdAt
      updatedAt
    }
  }
`;

export const ADD_WORK_COMMENT_MUTATION = gql`
  ${WORK_COMMENT_FIELDS}
  mutation AddWorkComment($workId: ID!, $body: String!, $parentCommentId: ID) {
    addWorkComment(workId: $workId, body: $body, parentCommentId: $parentCommentId) {
      ...WorkCommentFields
    }
  }
`;

export const UPDATE_WORK_COMMENT_MUTATION = gql`
  ${WORK_COMMENT_FIELDS}
  mutation UpdateWorkComment($commentId: ID!, $body: String!) {
    updateWorkComment(commentId: $commentId, body: $body) {
      ...WorkCommentFields
    }
  }
`;

export const DELETE_WORK_COMMENT_MUTATION = gql`
  ${WORK_COMMENT_FIELDS}
  mutation DeleteWorkComment($commentId: ID!) {
    deleteWorkComment(commentId: $commentId) {
      ...WorkCommentFields
    }
  }
`;

export const TOGGLE_WORK_COMMENT_LIKE_MUTATION = gql`
  ${WORK_COMMENT_FIELDS}
  mutation ToggleWorkCommentLike($commentId: ID!) {
    toggleWorkCommentLike(commentId: $commentId) {
      ...WorkCommentFields
    }
  }
`;

export const CREATE_FORUM_TOPIC_MUTATION = gql`
  ${FORUM_TOPIC_PREVIEW_FIELDS}
  mutation CreateForumTopic($input: CreateForumTopicInput!) {
    createForumTopic(input: $input) {
      ...ForumTopicPreviewFields
    }
  }
`;

export const UPDATE_FORUM_TOPIC_MUTATION = gql`
  ${FORUM_TOPIC_PREVIEW_FIELDS}
  mutation UpdateForumTopic($topicId: ID!, $input: UpdateForumTopicInput!) {
    updateForumTopic(topicId: $topicId, input: $input) {
      ...ForumTopicPreviewFields
    }
  }
`;

export const CREATE_FORUM_POST_MUTATION = gql`
  ${FORUM_POST_FIELDS}
  mutation CreateForumPost($topicId: ID!, $body: String!, $parentPostId: ID) {
    createForumPost(topicId: $topicId, body: $body, parentPostId: $parentPostId) {
      ...ForumPostFields
    }
  }
`;

export const UPDATE_FORUM_POST_MUTATION = gql`
  ${FORUM_POST_FIELDS}
  mutation UpdateForumPost($postId: ID!, $body: String!) {
    updateForumPost(postId: $postId, body: $body) {
      ...ForumPostFields
    }
  }
`;

export const DELETE_FORUM_POST_MUTATION = gql`
  ${FORUM_POST_FIELDS}
  mutation DeleteForumPost($postId: ID!) {
    deleteForumPost(postId: $postId) {
      ...ForumPostFields
    }
  }
`;

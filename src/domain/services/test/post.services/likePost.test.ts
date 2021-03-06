import { mongodb } from '../../../../infrastructure/orm'
import { testingLikedAndCommentedPersistedDtoPosts, testingLikedAndCommentedPersistedDomainModelPosts, testingDomainModelFreeUsers, savePosts, cleanPostsCollection } from '../../../../test/fixtures'

import { likePost } from '../../'
import { PostDomainModel, PostLikeOwnerDomainModel } from '../../../models'
import { GettingPostCommentError, LikingPostError, PostNotFoundError } from '../../../errors'
import { postDataSource } from '../../../../infrastructure/dataSources'
import { mapPostFromDtoToDomainModel } from '../../../../infrastructure/mappers'

describe('[SERVICES] Post - likePost', () => {
  const { connect, disconnect, models: { Post } } = mongodb

  const mockedPosts = testingLikedAndCommentedPersistedDomainModelPosts as PostDomainModel[]
  const originalPost = mockedPosts[0]
  const nonValidPostId = originalPost.comments[0].id as string

  beforeAll(async () => {
    await connect()
    await savePosts(testingLikedAndCommentedPersistedDtoPosts)
  })

  afterAll(async () => {
    await cleanPostsCollection()
    await disconnect()
  })

  it('must persist the new like into the selected post', async (done) => {
    const { id: postId } = originalPost
    const likeOwner = testingDomainModelFreeUsers[0] as PostLikeOwnerDomainModel

    await likePost(postId as string, likeOwner)

    const updatedPost = mapPostFromDtoToDomainModel(JSON.parse(JSON.stringify(await Post.findById(postId).lean()))) as PostDomainModel

    expect(updatedPost.id).not.toBeNull()
    expect(updatedPost.body).toBe(originalPost.body)
    expect(updatedPost.owner).toStrictEqual(originalPost.owner)
    expect(updatedPost.comments).toStrictEqual(originalPost.comments)

    expect(updatedPost.likes).toHaveLength(originalPost.likes.length + 1)
    const originalLikesIds = originalPost.likes.map(({ id }) => id as string)
    const updatedLikesIds = updatedPost.likes.map(({ id }) => id as string)
    const newLikeId = updatedLikesIds.find((updatedId) => !originalLikesIds.includes(updatedId))
    const newPersistedLike = updatedPost.likes.find((like) => like.id === newLikeId) as PostLikeOwnerDomainModel
    expect(newPersistedLike.id).toBe(likeOwner.id)
    expect(newPersistedLike.name).toBe(likeOwner.name)
    expect(newPersistedLike.surname).toBe(likeOwner.surname)
    expect(newPersistedLike.avatar).toBe(likeOwner.avatar)

    expect(updatedPost.createdAt).toBe(originalPost.createdAt)
    expect(updatedPost.updatedAt).not.toBe(originalPost.updatedAt)

    expect(updatedPost.createdAt).toBe(originalPost.createdAt)
    expect(updatedPost.updatedAt).not.toBe(originalPost.updatedAt)

    done()
  })

  it('must throw NOT_FOUND (404) when the provided post ID doesn\'t exist', async (done) => {
    const postId = nonValidPostId
    const likeOwner = testingDomainModelFreeUsers[0] as PostLikeOwnerDomainModel

    await expect(likePost(postId as string, likeOwner)).rejects.toThrowError(new PostNotFoundError(`Post '${postId}' not found`))

    done()
  })

  it('must throw INTERNAL_SERVER_ERROR (500) when the retrieving post pocess throws an error', async (done) => {
    jest.spyOn(postDataSource, 'getPostById').mockImplementation(() => {
      throw new Error('Testing error')
    })

    const { id: postId } = originalPost
    const likeOwner = testingDomainModelFreeUsers[0] as PostLikeOwnerDomainModel

    try {
      await likePost(postId as string, likeOwner)
    } catch (error) {
      expect(error).toStrictEqual(new GettingPostCommentError(`Error retereaving post comment. ${error.message}`))
    }

    jest.spyOn(postDataSource, 'getPostById').mockRestore()

    done()
  })

  it('must throw INTERNAL_SERVER_ERROR (500) when the liking process throws an exception', async (done) => {
    jest.spyOn(postDataSource, 'likePost').mockImplementation(() => {
      throw new Error('Testing error')
    })

    const { id: postId } = originalPost
    const likeOwner = testingDomainModelFreeUsers[0] as PostLikeOwnerDomainModel

    try {
      await likePost(postId as string, likeOwner)
    } catch (error) {
      expect(error).toStrictEqual(new LikingPostError(`Error setting like to post '${postId}' by user '${likeOwner.id}'. ${error.message}`))
    }

    jest.spyOn(postDataSource, 'likePost').mockRestore()

    done()
  })
})

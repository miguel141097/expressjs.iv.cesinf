import { mongodb } from '../../../../infrastructure/orm'
import { postDataSource } from '../../../../infrastructure/dataSources'
import { PostDomainModel } from '../../../models'
import { testingLikedAndCommentedPersistedDtoPosts, testingLikedAndCommentedPersistedDomainModelPosts, savePosts, cleanPostsCollection } from '../../../../test/fixtures'

import { getPosts } from '../..'
import { GettingPostError } from '../../../errors/PostErrors'
import { PostDto } from '../../../../infrastructure/dtos'

const mockedPosts = testingLikedAndCommentedPersistedDtoPosts as PostDto[]
const resultPosts = testingLikedAndCommentedPersistedDomainModelPosts as PostDomainModel[]

describe('[SERVICES] Post - getPosts', () => {
  const { connect, disconnect } = mongodb

  beforeAll(async () => {
    await connect()
    await savePosts(mockedPosts)
  })

  afterAll(async () => {
    await cleanPostsCollection()
    await disconnect()
  })

  it('must retrieve the whole persisted posts', async (done) => {
    const persistedPosts = await getPosts() as PostDomainModel[]

    expect(persistedPosts).toHaveLength(persistedPosts.length)

    persistedPosts.forEach((post) => {
      const expectedFields = ['id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
      const getAlldPostFields = Object.keys(post).sort()
      expect(getAlldPostFields.sort()).toEqual(expectedFields.sort())

      const expectedPost = resultPosts.find((resultPost) => resultPost.id === post.id?.toString()) as PostDomainModel

      expect(post).toStrictEqual<PostDomainModel>(expectedPost)
    })

    done()
  })

  it('must throw an INTERNAL_SERVER_ERROR (500) when the datasource throws an unexpected error', async (done) => {
    jest.spyOn(postDataSource, 'getPosts').mockImplementation(() => {
      throw new Error('Testing error')
    })

    try {
      await getPosts()
    } catch (error) {
      expect(error).toStrictEqual(new GettingPostError(`Error retereaving posts. ${error.message}`))
    }

    jest.spyOn(postDataSource, 'getPosts').mockRestore()

    done()
  })
})

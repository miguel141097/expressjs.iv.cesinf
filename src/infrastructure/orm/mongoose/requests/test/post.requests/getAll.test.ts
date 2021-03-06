import { connect, disconnect } from '../../../core'
import { PostDto } from '../../../../../dtos'
import { testingLikedAndCommentedPersistedDtoPosts, savePosts, cleanPostsCollection } from '../../../../../../test/fixtures'

import { getAll } from '../../post.mongodb.requests'

describe('[ORM] MongoDB - Posts - getAll', () => {
  const mockedPosts = testingLikedAndCommentedPersistedDtoPosts

  beforeAll(async () => {
    await connect()
    await savePosts(mockedPosts)
  })

  afterAll(async () => {
    await cleanPostsCollection()
    await disconnect()
  })

  it('must retrieve the whole persisted posts', async (done) => {
    const persistedPosts = await getAll() as PostDto[]

    expect(persistedPosts).toHaveLength(persistedPosts.length)

    persistedPosts.forEach((post) => {
      const expectedFields = ['_id', 'body', 'owner', 'comments', 'likes', 'createdAt', 'updatedAt']
      const getAlldPostFields = Object.keys(post).sort()
      expect(getAlldPostFields.sort()).toEqual(expectedFields.sort())

      const expectedPost = mockedPosts.find((mockedPost) => mockedPost._id === post._id?.toString()) as PostDto

      expect(post).toStrictEqual<PostDto>(expectedPost)
    })

    done()
  })
})

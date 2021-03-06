import { userDataSource } from '../../../../infrastructure/dataSources'
import { mongodb } from '../../../../infrastructure/orm'
import { UpdatingUserError } from '../../../errors'
import { NewUserDomainModel } from '../../../models'
import { testingUsers, cleanUsersCollection, saveUser, getUserByUsername } from '../../../../test/fixtures'

import { logout } from '../../authentication.services'

const { username, password, email, token } = testingUsers[0]

describe('[SERVICES] Authentication - logout', () => {
  const { connect, disconnect } = mongodb
  const mockedUserData: NewUserDomainModel & { token: string } = {
    username,
    password,
    email,
    token
  }

  beforeAll(async () => {
    await connect()
    await cleanUsersCollection()
  })

  beforeEach(async () => {
    await cleanUsersCollection()
    await saveUser(mockedUserData)
  })

  afterAll(async () => {
    await disconnect()
  })

  it('must logout the user and remove the persisted token', async (done) => {
    const { username } = mockedUserData
    const authenticatedUser = await getUserByUsername(username)
    expect(authenticatedUser.token).toBe(token)

    const { _id: userId } = authenticatedUser
    await logout(userId)

    const unauthenticatedUser = await getUserByUsername(username)

    expect(unauthenticatedUser.token).toBe('')

    done()
  })

  it('must throw an INTERNAL_SERVER_ERROR (500) when the updating logout user data process fails', async (done) => {
    jest.spyOn(userDataSource, 'updateUserById').mockImplementation(() => {
      throw new Error('Testing Error')
    })

    const { username } = mockedUserData
    const { _id: userId } = await getUserByUsername(username)

    try {
      await logout(userId)
    } catch (error) {
      expect(error).toStrictEqual(new UpdatingUserError(`Error updating user '${userId}' logout data. ${error.message}`))
    }

    jest.spyOn(userDataSource, 'updateUserById').mockRestore()

    done()
  })
})

import UserMenu from './UserMenu'

const keys = (items) => items.map((i) => i.key)

describe('UserMenu', () => {
  it('nests entries under the username when horizontal', () => {
    const [root] = UserMenu(true, 'ada', () => {})
    expect(root.key).toBe('navbar-sub-menu')
    expect(keys(root.children)).toEqual(['account', 'sign-out'])
  })

  it('lists entries flat in the drawer', () => {
    expect(keys(UserMenu(false, 'ada', () => {}))).toEqual(['account', 'sign-out'])
  })

  it('omits Upload, which the drawer already renders as a primary route', () => {
    const flat = UserMenu(false, 'ada', () => {})
    const horizontal = UserMenu(true, 'ada', () => {})[0].children
    expect(keys(flat)).not.toContain('upload')
    expect(keys(horizontal)).not.toContain('upload')
  })
})

import About from './Components/About'
import Account from './Components/Account'
import Authentication from './Components/Authentication'
import Browse from './Components/Browse'
import NavButton from './Components/Header/NavButton'
import Home from './Components/Home'
import Upload from './Components/Upload'
import View from './Components/View'

const routes = [
  {
    label: 'Home',
    route: '/',
    viewRenderer: Home,
    requiresAuth: false,
  },
  {
    label: 'Browse',
    route: '/browse',
    navbarRenderer: NavButton,
    viewRenderer: Browse,
    requiresAuth: false,
  },
  {
    label: 'View',
    route: '/view',
    navbarRenderer: NavButton,
    viewRenderer: View,
    requiresAuth: true,
  },
  {
    label: 'Upload',
    route: '/upload',
    navbarRenderer: NavButton,
    viewRenderer: Upload,
    requiresAuth: true,
  },
  {
    label: 'Account',
    route: '/account',
    viewRenderer: Account,
    requiresAuth: true,
  },
  {
    label: 'About',
    route: '/about',
    viewRenderer: About,
    requiresAuth: false,
  },
  {
    label: 'Authenticate',
    route: '/authentication',
    viewRenderer: Authentication,
    requiresAuth: false,
  },
]

/**
 * Every route, including protected ones. Used for rendering so a logged-out
 * request for a protected path still matches and can explain itself rather
 * than silently falling through to the home page.
 */
export const allRoutes = routes

/** Routes shown in the nav bar; protected ones stay hidden when logged out. */
export default (loggedIn) =>
  routes.filter(({ requiresAuth }) => loggedIn || !requiresAuth)

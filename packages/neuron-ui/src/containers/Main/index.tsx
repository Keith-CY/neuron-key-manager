import React from 'react'
import { Route, RouteComponentProps } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useState } from 'states/stateProvider'
import { StateDispatch } from 'states/stateProvider/reducer'

import WalletWizard from 'components/WalletWizard'
import ImportKeystore from 'components/ImportKeystore'
import Receive from 'components/Receive'
import LaunchScreen from 'components/LaunchScreen'
import PasswordRequest from 'components/PasswordRequest'

import { Routes } from 'utils/const'

import { useSubscription, useOnCurrentWalletChange } from './hooks'

export const mainContents: CustomRouter.Route[] = [
  {
    name: `Launch`,
    path: Routes.Launch,
    exact: true,
    comp: LaunchScreen,
  },
  {
    name: `Receive`,
    path: Routes.Receive,
    params: `/:address?`,
    exact: false,
    comp: Receive,
  },
  {
    name: `WalletWizard`,
    path: Routes.WalletWizard,
    exact: false,
    comp: WalletWizard,
  },
  {
    name: `ImportKeystore`,
    path: Routes.ImportKeystore,
    exact: false,
    comp: ImportKeystore,
  },
  {
    name: `PasswordRequest`,
    path: '/',
    exact: false,
    comp: PasswordRequest,
  },
]

const MainContent = ({
  history,
  dispatch,
}: React.PropsWithoutRef<{ dispatch: StateDispatch } & RouteComponentProps>) => {
  const neuronWalletState = useState()
  const {
    wallet: { id: walletID = '' },
  } = neuronWalletState
  const [, i18n] = useTranslation()

  useSubscription({ walletID, history, dispatch })

  useOnCurrentWalletChange({ walletID, i18n, history, dispatch })

  return (
    <>
      {mainContents.map(container => (
        <Route
          exact={container.exact}
          path={`${container.path}${container.params || ''}`}
          key={container.name}
          render={routerProps => {
            return <container.comp {...routerProps} {...neuronWalletState} dispatch={dispatch} />
          }}
        />
      ))}
    </>
  )
}

MainContent.displayName = 'Main'

export default MainContent

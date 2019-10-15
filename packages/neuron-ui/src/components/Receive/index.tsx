import React from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Stack, Text } from 'office-ui-fabric-react'

import { StateWithDispatch } from 'states/stateProvider/reducer'
import QRCode from './qr-code'

const Receive = ({
  wallet: { address = '' },
  dispatch,
}: React.PropsWithoutRef<StateWithDispatch & RouteComponentProps>) => {
  const [t] = useTranslation()

  const accountAddress = address

  if (!accountAddress) {
    return <div>{t('receive.address-not-found')}</div>
  }

  return (
    <Stack horizontal tokens={{ childrenGap: 40 }} horizontalAlign="space-between">
      <Stack styles={{ root: { flex: 1 } }} tokens={{ childrenGap: 20 }}>
        <Stack style={{ alignSelf: 'center' }}>
          <Text
            variant="large"
            as="h1"
            style={{
              padding: '0 15px',
              textAlign: 'center',
            }}
          >
            {t('receive.mainnet-address')}
          </Text>
          <QRCode value={accountAddress} size={320} exportable includeMargin dispatch={dispatch} />
        </Stack>

        <Text
          variant="large"
          style={{
            textAlign: 'center',
          }}
        >
          {t('receive.prompt')}
        </Text>
      </Stack>
    </Stack>
  )
}

Receive.displayName = 'Receive'

export default Receive

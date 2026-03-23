import { FaRegIdBadge } from "react-icons/fa6";
import { Card, CardBody, Progress, Link } from "@nextui-org/react";
import { useContext, useEffect } from "react";
import { StoreContext } from '../../contexts'
import * as fcl from "@onflow/fcl";
import { isEnableBiometric, login } from "../../account";
import Router from "next/router";

const ProgressBar = ({txId, network}) => {

  const {store, setStore} = useContext(StoreContext)

  const url = `https://${network === 'testnet' ? 'testnet.' : ''}flowindex.io/tx/${txId}`

  useEffect(() => {
    const waitForTx = async () => {
      const result = await fcl.tx(txId).onceSealed()
      const events = result.events.filter(event => event.type === 'flow.AccountCreated')
      if (events.length == 0) {
        Router.push('/')
        return
      }
      const address = events[0].data.address
      const userInfo = { ...store }
      userInfo.address = address
      delete userInfo.isCreating
      delete userInfo.txId
      if (isEnableBiometric()) {
        delete userInfo.keyInfo.pk
        delete userInfo.keyInfo.mnemonic
      }
      setStore(userInfo);
      login(userInfo)
      return address
    };

    if (txId) {
      console.log('txId ===>', txId)
      waitForTx();
    }

  }, [txId])

  return (
    <Card className="w-full">
      <CardBody className="flex flex-col space-y-4 p-6">
        <div className="flex items-center gap-4">
          <FaRegIdBadge className="text-2xl" />
          <h1 className="text-2xl font-bold text-gray-300">
            Creating Flow Address
          </h1>
        </div>
        <Progress
          size="md"
          color="primary"
          isIndeterminate
          aria-label="Loading..."
          className="max-w"
        />
        <Link isExternal showAnchorIcon href={url} underline="hover" color="warning">View in FlowIndex</Link>
      </CardBody>
    </Card>
  );
};

export default ProgressBar;

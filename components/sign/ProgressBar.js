import { FaRegIdBadge } from "react-icons/fa6";
import { Card, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
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
    <Card className="w-full border-zinc-800 bg-zinc-900/90">
      <CardContent className="flex flex-col space-y-4 p-6">
        <div className="flex items-center gap-4">
          <FaRegIdBadge className="text-2xl" />
          <h1 className="text-2xl font-bold text-gray-300">
            Creating Flow Address
          </h1>
        </div>
        <Progress
          value={100}
          className="max-w [&>div]:animate-pulse [&>div]:bg-emerald-500"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-500 hover:underline text-sm inline-flex items-center gap-1"
        >
          View in FlowIndex
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </CardContent>
    </Card>
  );
};

export default ProgressBar;

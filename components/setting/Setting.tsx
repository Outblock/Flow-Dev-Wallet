import { Card, CardContent } from "../ui/card";
import { Switch } from "../ui/switch";
import { useContext, useEffect, useState } from "react";
import { StoreContext } from "../../contexts";
import { KEY_TYPE } from "../../utils/constants";
import KeyInfoCard from "./KeyInfoCard";
import {
  IoKeyOutline,
  IoChevronForwardOutline,
  IoFingerPrintOutline,
} from "react-icons/io5";
import { KEYS, deleteKeyInfo, isEnableBiometric, set, login } from "../../account";

const Setting = () => {
  const [enableBiometric, setEnableBiometric] = useState(isEnableBiometric());
  const { store, setStore } = useContext(StoreContext);
  const [isExpanded, setExpanded] = useState(false);

  const handleKeyInfo = async (isSelected: boolean) => {
    if (isSelected) {
      // With FLIP-264 passkeys, there's no pk/mnemonic to clear.
      // For non-passkey keys, clear sensitive fields.
      const userInfo = { ...store };
      if (userInfo.keyInfo) {
        delete userInfo.keyInfo.pk;
        delete userInfo.keyInfo.mnemonic;
      }
      setStore(userInfo);
      login(userInfo);
    } else {
      // With FLIP-264, passkey info is already in store — no need to re-derive.
      // For passkey accounts, the keyInfo stays as-is (credentialId-based).
      setStore((s: any) => ({ ...s }));
      login(store);
    }
  };

  console.log('store ==>', store)

  return (
    <div className="flex flex-col gap-3">
      <Card className="border-zinc-800 bg-zinc-900/90">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <IoFingerPrintOutline className="text-2xl text-gray-300" />
            <div className="flex flex-col grow">
              <p className="font-bold text-sm">Biometric</p>
              {store.id ? (
                <p className="text-sm text-gray-500">
                  Enable biometric check every time
                </p>
              ) : (
                <p className="text-sm text-red-600">For passkey account only</p>
              )}
            </div>
            <Switch
              disabled={store.id == null}
              checked={enableBiometric}
              onCheckedChange={(checked: boolean) => {
                console.log("onCheckedChange ==>", enableBiometric);
                setEnableBiometric(checked);
                set(KEYS.BIOMETRIC, checked);
                handleKeyInfo(checked);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/90">
        <CardContent className="p-4 gap-2 transition-transform">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setExpanded((s) => !isExpanded)}
          >
            <IoKeyOutline className="text-2xl text-gray-300" />
            <div className="flex flex-col grow ">
              <p className="font-bold text-sm">Private Key</p>
              <p className="text-sm text-gray-500">
                View seed phrase or private key
              </p>
            </div>
            {isExpanded ? (
              <IoChevronForwardOutline className="text-lg text-gray-500" />
            ) : (
              <IoChevronForwardOutline className="text-lg text-gray-500" />
            )}
          </div>

          {isExpanded && <KeyInfoCard className="!transition-transform" />}
        </CardContent>
      </Card>
    </div>
  );
};

export default Setting;

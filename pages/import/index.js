import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  useDisclosure,
} from "@nextui-org/react";
import { StoreContext } from "../../contexts";
import { useEffect, useState, useContext } from "react";
import styles from "../../styles/Home.module.css";
import { FaKey } from "react-icons/fa6";
import { KEY_TAB } from "../../utils/keyTab";
import EmptyAddressModal from "./emptyAddressModal";
import JsonImport from "./jsonImport";
import SeedPhraseImport from "./seedPhraseImport";
import PrivateKeyImport from "./privateKeyImport";
import ImportAddressModel from "./importAddressModal";
import { KEY_TYPE } from "../../utils/constants";
import Router from "next/router";
import { login, set } from "../../account";

const Import = () => {
  const { store, setStore } = useContext(StoreContext);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isImport,
    onOpen: onImport,
    onOpenChange: onImportChange,
  } = useDisclosure();
  const [importData, setImportData] = useState(null);

  const handleImport = (accounts) => {
    onImport();

    setImportData(accounts);
  };

  const handleAddressSelection = (address) => {
    console.log("handleAddressSelection ==>", address);
    console.log(
      "handleAddressSelection ==>",
      importData.filter((account) => account.address === address)[0],
      importData
    );
    const account = importData.filter(
      (account) => account.address === address
    )[0];

    const userInfo = { ...store };
    userInfo.address = address
    userInfo.keyInfo = account
    setStore(userInfo);
    login(userInfo)
    Router.push("/");
  };

  return (
    <div className={styles.container}>
      <main className={`${styles.main} dark text-foreground bg-background`}>
        <div className="w-1/2 min-w-[calc(max(50%,356px))] max-w-[calc(min(50%,356px))] sm:w-full h-dvh py-5 flex flex-col gap-6 items-center justify-center">
          <Card
            className="!h-auto !transition-all max-w-full"
            style={{ transition: "all .3s ease-in-out" }}
          >
            <div className="flex flex-col w-full gap-4 px-6 pt-6 items-start">
              <div className="flex items-center gap-4">
                <FaKey className="text-2xl" />
                <h1 className="text-2xl font-bold text-gray-300">
                  Import Address
                </h1>
              </div>
              <h1 className="text-1xl text-gray-500 pb-3">
                Import using seed phrase, private key, or JSON keystore
              </h1>
            </div>
            <CardBody
              className="w-full !h-auto !transition-all"
              style={{ transition: "all .3s ease-in-out" }}
            >
              <EmptyAddressModal
                isOpen={isOpen}
                onOpen={onOpen}
                onOpenChange={onOpenChange}
              />
              <ImportAddressModel
                accounts={importData}
                handleAddressSelection={handleAddressSelection}
                isOpen={isImport}
                onOpen={onImport}
                onOpenChange={onImportChange}
                importData={importData}
              />
              <div className="flex w-full flex-col">
                <Tabs
                  aria-label="Options"
                  color="warning"
                  variant="solid"
                  fullWidth
                  items={KEY_TAB}
                >
                  {(item) => (
                    <Tab
                      key={item.id}
                      title={
                        <div className="flex items-center space-x-2">
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                      }
                    >
                      {(() => {
                        switch (item.id) {
                          case "seed":
                            return (
                              <SeedPhraseImport
                                onOpen={onOpen}
                                onImport={handleImport}
                              />
                            );
                          case "key":
                            return (
                              <PrivateKeyImport
                                onOpen={onOpen}
                                onImport={handleImport}
                              />
                            );
                          case "json":
                            return (
                              <JsonImport onOpen={onOpen} onImport={handleImport} />
                            );
                          default:
                            return <p>Not available</p>;
                        }
                      })()}
                    </Tab>
                  )}
                </Tabs>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Import;

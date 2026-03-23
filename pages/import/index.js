import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { StoreContext } from "../../contexts";
import { useState, useContext } from "react";
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
import { motion, AnimatePresence } from "motion/react";

const Import = () => {
  const { store, setStore } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isImport, setIsImport] = useState(false);
  const [importData, setImportData] = useState(null);
  const [activeTab, setActiveTab] = useState("seed");

  const onOpen = () => setIsOpen(true);
  const onOpenChange = (open) => setIsOpen(open);
  const onImport = () => setIsImport(true);
  const onImportChange = (open) => setIsImport(open);

  const handleImport = (accounts) => {
    onImport();
    setImportData(accounts);
  };

  const handleAddressSelection = (address) => {
    const account = importData.filter(
      (account) => account.address === address
    )[0];

    const userInfo = { ...store };
    userInfo.address = address;
    userInfo.keyInfo = account;
    setStore(userInfo);
    login(userInfo);
    Router.push("/");
  };

  const tabContent = {
    seed: <SeedPhraseImport onOpen={onOpen} onImport={handleImport} />,
    key: <PrivateKeyImport onOpen={onOpen} onImport={handleImport} />,
    json: <JsonImport onOpen={onOpen} onImport={handleImport} />,
  };

  return (
    <div className={styles.container}>
      <main className={`${styles.main} dark text-foreground bg-background`}>
        <div className="w-1/2 min-w-[calc(max(50%,356px))] max-w-[calc(min(50%,356px))] sm:w-full h-dvh py-5 flex flex-col gap-6 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full"
          >
            <Card className="overflow-hidden">
              <motion.div
                className="flex flex-col w-full gap-4 px-6 pt-6 items-start"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ rotate: -20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <FaKey className="text-2xl text-[#00EF8B]" />
                  </motion.div>
                  <h1 className="text-2xl font-bold text-gray-300">
                    Import Address
                  </h1>
                </div>
                <p className="text-sm text-gray-500 pb-1">
                  Import using seed phrase, private key, or JSON keystore
                </p>
              </motion.div>

              <CardContent className="w-full">
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
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full">
                      {KEY_TAB.map((item, i) => (
                        <motion.div
                          key={item.id}
                          className="flex-1"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                        >
                          <TabsTrigger value={item.id} className="w-full">
                            <div className="flex items-center space-x-2">
                              {item.icon}
                              <span>{item.name}</span>
                            </div>
                          </TabsTrigger>
                        </motion.div>
                      ))}
                    </TabsList>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <TabsContent value={activeTab} forceMount>
                          {tabContent[activeTab]}
                        </TabsContent>
                      </motion.div>
                    </AnimatePresence>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Import;

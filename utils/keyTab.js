import { LuFileJson } from "react-icons/lu";
import { TbPassword } from "react-icons/tb";
import { FaListOl } from "react-icons/fa6";

import JsonImport from "../pages/import/jsonImport";
import SeedPhraseImport from "../pages/import/seedPhraseImport";
import PrivateKeyImport from "../pages/import/privateKeyImport";

export const KEY_TAB = [
    {
        id: "seed",
        name: "Seed Phrase",
        icon: <FaListOl/>,
        node: <SeedPhraseImport/>
    },
    {
        id: "key",
        name: "Private Key",
        icon: <TbPassword/>,
        node: <PrivateKeyImport/>
    },
    {
        id: "json",
        name: "JSON Keystore",
        icon: <LuFileJson/>,
        node: <JsonImport/>
    },
]
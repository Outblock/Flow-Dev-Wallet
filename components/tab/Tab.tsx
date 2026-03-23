import { IoMdSettings } from "react-icons/io";
import { IoWallet, IoListOutline } from "react-icons/io5";
import { IoMdCube } from "react-icons/io";
import { ReactElement } from "react";

export interface TabItem {
  id: string;
  icon: ReactElement;
}

export const TAB: TabItem[] = [
    {
        id: "Token",
        icon: <IoWallet/>
    },
    {
        id: "Activity",
        icon: <IoListOutline/>
    },
    {
        id: "NFT",
        icon: <IoMdCube/>
    },
    {
        id: "Setting",
        icon: <IoMdSettings/>
    }
]

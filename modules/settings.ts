import { jsonToString } from "./utils.js";
import { notEmpty, notNull } from "./common.js";

interface CredentialUser {
	name: string;
	displayName: string;
}

interface Credential {
	instant: string;
	user: CredentialUser;
	id: string;
	credentialPublicKey: unknown;
	response: unknown;
}

interface Settings {
	credentials: Record<string, Credential>;
	rp?: unknown;
	user?: unknown;
	[key: string]: unknown;
}

export function createCredentialsList(select: HTMLSelectElement, settings: Settings, id: string): HTMLSelectElement {
	select.innerHTML = "";

	let option = document.createElement("option");
	option.setAttribute("value", "");
	option.innerText = "";
	select.appendChild(option);

	let selected: HTMLOptionElement = option;

	option = document.createElement("option");
	option.setAttribute("value", "*");
	option.innerText = "All";
	select.appendChild(option);

	for (const i in settings.credentials) {
		const cred = settings.credentials[i];
		const text = `${cred.instant} - ${cred.user.name} (${cred.user.displayName})`
		option = document.createElement("option");
		option.setAttribute("value", cred.id);
		option.innerText = text;
		select.appendChild(option);
		if (notEmpty(id) && (cred.id === id)) {
			selected = option;
		}
	}

	selected.setAttribute("selected", "selected");

	return select;
}

export function addCredential(settings: Settings, user: CredentialUser, id: string, credentialPublicKey: unknown, response: unknown): void {
	if (notEmpty(id)) {
		settings.credentials[id] = {
			"instant": new Date().toISOString(),
			"user": {
				"name": user.name,
				"displayName": user.displayName,
			},
			"id": id,
			"credentialPublicKey": credentialPublicKey,
			"response": response,
		};
		saveSettings(settings);
	}
}

export function getCredential(settings: Settings, id: string): Credential | undefined {
	const cred = settings.credentials[id];
	return cred;
}

export function getUsername(id: string): string | null {
	const seetings = readSettings()
	if (id in seetings.credentials) {
		const cred = seetings.credentials[id];
		console.log("cred ==>", cred, id)
		return cred.user.name;
	}
	return null;
}

export function readSettings(): Settings {
	let settings: Settings = {
		"credentials": {},
	};
	const s = window.localStorage.getItem("settings");
	if (notEmpty(s)) {
		try {
			settings = JSON.parse(s as string);
		} catch {
		}
		if ("rp" in (settings as any)) {
			delete (settings as any).rp;
		}
		if ("user" in (settings as any)) {
			delete (settings as any).user;
		}
		if (!("credentials" in settings)) {
			(settings as any).credentials = {};
		}
	}
	return settings;
}

export function saveSettings(settings: Settings | null): void {
	if (notNull(settings)) {
		window.localStorage.setItem("settings", jsonToString(settings));
	} else {
		window.localStorage.removeItem("settings");
	}
}

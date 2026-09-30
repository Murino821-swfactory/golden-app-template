import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getAuthInstance, getCollectionPath, getFirestoreInstance } from "@/lib/firebase";
import { decodeSnapshot, encodeSnapshot, type ResearchSnapshot, type SavedResearch } from "./saved";

const records = () => collection(getFirestoreInstance(), getCollectionPath("research"));
function uid(): string {
  const id = getAuthInstance().currentUser?.uid;
  if (!id) throw new Error("Sign in required");
  return id;
}
function decode(id: string, data: Record<string, unknown>): SavedResearch {
  return { id, title: String(data.title ?? ""), notes: String(data.notes ?? ""), snapshot: decodeSnapshot(String(data.snapshotJson)) };
}
export interface ResearchStore {
  list(): Promise<SavedResearch[]>;
  get(id: string): Promise<SavedResearch>;
  save(id: string, title: string, snapshot: ResearchSnapshot): Promise<void>;
  notes(id: string, notes: string): Promise<void>;
  remove(id: string): Promise<void>;
}
export const researchStore: ResearchStore = {
  async list() {
    const owner = uid();
    const result = await getDocs(query(records(), where("userId", "==", owner)));
    return result.docs.map(d => decode(d.id, d.data())).sort((a, b) => b.snapshot.searchedAt.localeCompare(a.snapshot.searchedAt));
  },
  async get(id) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error("Invalid ID");
    const owner = uid(), result = await getDoc(doc(records(), id));
    if (!result.exists() || result.data().userId !== owner) throw new Error("Research unavailable");
    return decode(result.id, result.data());
  },
  async save(id, title, snapshot) {
    const owner = uid(), name = title.trim();
    if (!name || name.length > 120) throw new Error("Invalid title");
    await setDoc(doc(records(), id), { userId: owner, title: name, notes: "", snapshotJson: encodeSnapshot(snapshot), createdAt: serverTimestamp() });
  },
  async notes(id, notes) {
    if (notes.length > 10_000) throw new Error("Notes too long");
    await this.get(id);
    await updateDoc(doc(records(), id), { notes, updatedAt: serverTimestamp() });
  },
  async remove(id) {
    await this.get(id);
    await deleteDoc(doc(records(), id));
  },
};

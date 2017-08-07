import { IContext } from "../types";

export const patient = async (_, args, { getDb }: IContext) => {
  const db = await getDb();
  return db
    .collection("users")
    .findOne({ _id: args.patientId })
};

export const patientsByStatus = async (_, args, { getDb }: IContext) => {
  const db = await getDb();
  return db.collection("users").find({ status: args.status }).toArray();
};

export const staffMembers = async (_, args, { getDb }: IContext) => {
  const db = await getDb();
  return db.collection("users").find({ patientState: { $exists: 0 } }).toArray();
};
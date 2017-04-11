export default {
  createEvent: async (_, args, { db }) => {
    const event = {
      createdAt: new Date(),
      updatedAt: new Date(),
      ...JSON.parse(args.payload),
    }
    const { result } = await db.collection('event').insert(event)
    return result.nInserted === 1
  },
}

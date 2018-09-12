import { ObjectID } from 'mongodb'

export const Assessment = {
  tags: async (assessment, _, { getDb }) => {
    const db = await getDb()
    console.log(assessment, '@assessment')
    const { tags = [], value, createdAt, _id } = assessment
    const transforTags = []
    if (tags.length) {
      tags.map((o, index) => {
        transforTags.push({
          _id: `${_id}_${index}_tag`,
          value: '饮食不均衡',
        })
      })
    }
    return transforTags
  },
}

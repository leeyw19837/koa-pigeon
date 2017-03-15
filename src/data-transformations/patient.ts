export const transformPatient = old => ({
  _id: old._id,
  name: old.nickname,
})
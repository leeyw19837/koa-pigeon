import {
  sharedNeedleChatMessageResolvers,
  sharedCouldWithdrawMessageResolvers,
} from './NeedleChatMessage'

export const NeedleImageMessage = {
  ...sharedNeedleChatMessageResolvers,
  ...sharedCouldWithdrawMessageResolvers,
}

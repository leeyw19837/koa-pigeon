import {
  sharedNeedleChatMessageResolvers,
  sharedCouldWithdrawMessageResolvers,
} from './NeedleChatMessage'

export const NeedleTextMessage = {
  ...sharedNeedleChatMessageResolvers,
  ...sharedCouldWithdrawMessageResolvers,
}

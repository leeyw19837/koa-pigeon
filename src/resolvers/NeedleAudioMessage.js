import {
  sharedNeedleChatMessageResolvers,
  sharedCouldWithdrawMessageResolvers,
} from './NeedleChatMessage'

export const NeedleAudioMessage = {
  ...sharedNeedleChatMessageResolvers,
  ...sharedCouldWithdrawMessageResolvers,
}

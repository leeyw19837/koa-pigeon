export const APP_ID = '15554220';
export const API_KEY = 'OA49H41Ui2ZLMkhDeIFdKGMF';
export const SECRET_KEY = 'eXCHspOpwIkWjEWIvDjKCsGcp4gQYgsM';

export const FACE_RESPONSE_CODE = {
  'success': 0,
  'error_search_user_not_found': 1001,
  'error_search_user_found_not_match': 1002,
  'error_search_other_errors': 1003,
  'error_add_user_user_not_exist': 2001,
  'error_add_user_other_errors': 2002,
  'error_detect_user_face_invalid': 3001,
  'error_check_in_already_signed': 4001,//签到错误，已经签到
  'error_check_in_need_contact_cde': 4002,//签到错误，需要联系照护师
  'error_check_in_should_check_certain_day': 4003,//签到错误: 共同照护患者不在当天看诊计划中
  'error_check_in_other_reasons': 4004,//其他签到错误类型，直接提示
}

export const EmptyUserInfo = {
  userId: '',
  phoneNumber: '',
  nickname: '',
  idCard: '',
}

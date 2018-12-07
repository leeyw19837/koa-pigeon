export const TEMPLATE_CODES = {
  verification: [
    'SMS_86070028',
    'SMS_78800199',
    'SMS_78800197',
    'SMS_78800198',
    'SMS_78800200',
    'SMS_78800201',
    'SMS_78800203',
    'SMS_142946848',
  ],
  duty: ['SMS_145501348', 'SMS_128635144', 'SMS_128635142'],
}

export const shouldRefuseSync = templateCode => {
  const { verification, duty } = TEMPLATE_CODES
  const refuseCodes = [...verification, ...duty]
  return refuseCodes.includes(templateCode)
}

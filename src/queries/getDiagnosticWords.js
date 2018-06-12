export const getDiagnosticWords = async (_, args, { getDb }) => {
    const diagnoseType = args.diagnoseType
    const bloodGlucoseValue = args.bloodGlucoseValue
    const bgValueBeforeMeal = args.bgValueBeforeMeal

    const diagnosticWordsResult = await db
        .collection('diagnosticWords')
        .find({diagnoseType:diagnoseType})
        .toArray()

    let randomResult
    let _diagnoseWords = ''
    let _diagnoseSourceType = ''
    switch (diagnoseType) {
        case 'a':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/,bloodGlucoseValue)}`
            _diagnoseSourceType = randomResult.sourceType
            break

        case 'b':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords}`
            _diagnoseSourceType = randomResult.sourceType
            break

        case 'c':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords}`
            _diagnoseSourceType = randomResult.sourceType
            break

        case 'd':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords.replace(/X/,bloodGlucoseValue).replace(/Y/,bgValueBeforeMeal)}`
            _diagnoseSourceType = randomResult.sourceType
            break

        case 'e':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords}`
            _diagnoseSourceType = randomResult.sourceType
            break

        case 'f':
            randomResult = diagnosticWordsResult[Math.floor(Math.random() * diagnosticWordsResult.length)]
            _diagnoseWords = `${randomResult.diagnoseWords}`
            _diagnoseSourceType = randomResult.sourceType
            break

        default:
            _diagnoseWords = ''
            _diagnoseSourceType = ''
    }

    return {
        diagnoseWords: _diagnoseWords,
        sourceType:_diagnoseSourceType,
    }

}
export const useFeedback = () => {
  const showFeedback = useState('show-feedback', () => false)
  const feedbackSource = useState('feedback-source', () => 'General')

  const openFeedback = (source: string = 'General') => {
    feedbackSource.value = source
    showFeedback.value = true
  }

  const closeFeedback = () => {
    showFeedback.value = false
  }

  return {
    showFeedback,
    feedbackSource,
    openFeedback,
    closeFeedback
  }
}

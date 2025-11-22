import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';

// Sample questions - fallback if API fails
const QUESTION_BANK = [
  { question: "What is the capital of India?", answer: "New Delhi" },
  { question: "What is the largest planet in our solar system?", answer: "Jupiter" },
  { question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci" },
  { question: "What is the chemical symbol for gold?", answer: "Au" },
  { question: "What year did World War II end?", answer: "1945" },
  { question: "What is the smallest country in the world?", answer: "Vatican City" },
  { question: "Who wrote Romeo and Juliet?", answer: "William Shakespeare" },
  { question: "What is the speed of light?", answer: "299,792,458 m/s" },
  { question: "What is the capital of France?", answer: "Paris" },
  { question: "How many continents are there?", answer: "7" },
  { question: "What is the longest river in the world?", answer: "The Nile" },
  { question: "Who invented the telephone?", answer: "Alexander Graham Bell" },
  { question: "What is the hardest natural substance?", answer: "Diamond" },
  { question: "What is the currency of Japan?", answer: "Yen" },
  { question: "Who was the first person on the moon?", answer: "Neil Armstrong" },
  { question: "What is the largest ocean?", answer: "Pacific Ocean" },
  { question: "What is the boiling point of water?", answer: "100°C" },
  { question: "Who wrote Harry Potter?", answer: "J.K. Rowling" },
  { question: "What is the capital of Australia?", answer: "Canberra" },
  { question: "How many bones are in the human body?", answer: "206" }
];

const DEFAULTS = {
  questionsPerPlayer: 2,
  questionTime: 10,
  votingTime: 30,
  startingLives: 2
};

const App = () => {
  const [screen, setScreen] = useState('landing');
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState(['', '']);
  const [persona, setPersona] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerOrder, setPlayerOrder] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [globalQuestionIndex, setGlobalQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [timer, setTimer] = useState(DEFAULTS.questionTime);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    questionsPerPlayer: DEFAULTS.questionsPerPlayer,
    questionTime: DEFAULTS.questionTime,
    votingTime: DEFAULTS.votingTime,
    startingLives: DEFAULTS.startingLives
  });

  // Timer countdown
  useEffect(() => {
    if (screen === 'question' || screen === 'voting') {
      const interval = setInterval(() => {
        setTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  const startGame = () => {
    setScreen('setup');
  };

  const handleNumPlayersChange = (num) => {
    const count = Math.max(2, Math.min(12, num));
    setNumPlayers(count);
    setPlayerNames(Array(count).fill('').map((_, i) => playerNames[i] || ''));
  };

  const handleNameChange = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const proceedToPersona = () => {
    if (playerNames.some(name => !name.trim())) {
      alert('Please enter all player names');
      return;
    }
    setScreen('persona');
  };

  const generateQuestionsWithGemini = async () => {
    if (!persona.trim()) {
      alert('Please describe your group persona');
      return;
    }

    setIsGeneratingQuestions(true);

    try {
      // Calculate total questions needed (capped at 500)
      const totalQuestions = Math.min(
        Math.pow(numPlayers, 2) * settings.startingLives * settings.questionsPerPlayer * 2,
        500
      );
      
      const response = await fetch('http://localhost:3001/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona,
          totalQuestions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid question format received');
      }

      // Shuffle questions to randomize order
      const shuffledQuestions = data.questions.sort(() => Math.random() - 0.5);

      startGameplay(shuffledQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Failed to generate questions. Using default question bank instead.');
      // Fallback to default questions
      const fallbackQuestions = [];
      const totalQuestions = Math.pow(numPlayers, 2) * settings.startingLives * settings.questionsPerPlayer * 2;
      for (let i = 0; i < totalQuestions; i++) {
        fallbackQuestions.push(QUESTION_BANK[i % QUESTION_BANK.length]);
      }
      startGameplay(fallbackQuestions);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startGameplay = (generatedQuestions) => {
    const initialPlayers = playerNames.map((name, index) => ({
      id: index,
      name: name.trim(),
      lives: settings.startingLives
    }));

    setPlayers(initialPlayers);
    setQuestions(generatedQuestions);
    setGlobalQuestionIndex(0);
    startNewRound(initialPlayers, 1);
  };

  const startNewRound = (currentPlayers, roundNumber) => {
    const activePlayers = currentPlayers.filter(p => p.lives > 0);
    
    if (activePlayers.length <= 1) {
      setScreen('winner');
      return;
    }

    setCurrentRound(roundNumber || currentRound);
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    setPlayerOrder(shuffled);
    setCurrentPlayerIndex(0);
    setCurrentQuestionIndex(0);
    setShowingAnswer(false);
    setTimer(settings.questionTime);
    setScreen('question');
  };

  const handleAnswer = () => {
    setShowingAnswer(true);
  };

  const handleNext = () => {
    const totalQuestionsThisRound = playerOrder.length * settings.questionsPerPlayer;
    const nextQuestionIndex = currentQuestionIndex + 1;
    
    // Always increment global question index
    setGlobalQuestionIndex(globalQuestionIndex + 1);
    
    if (nextQuestionIndex < totalQuestionsThisRound) {
      const nextPlayerIndex = nextQuestionIndex % playerOrder.length;
      setCurrentPlayerIndex(nextPlayerIndex);
      setCurrentQuestionIndex(nextQuestionIndex);
      setShowingAnswer(false);
      setTimer(settings.questionTime);
    } else {
      setTimer(settings.votingTime);
      setSelectedPlayer(null);
      setShowConfirmation(false);
      setScreen('voting');
    }
  };

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayer(playerId);
    setShowConfirmation(true);
  };

  const handleConfirmVote = () => {
    if (selectedPlayer === null) return;

    const updatedPlayers = players.map(p => 
      p.id === selectedPlayer ? { ...p, lives: p.lives - 1 } : p
    );
    setPlayers(updatedPlayers);
    setShowConfirmation(false);
    
    const activePlayers = updatedPlayers.filter(p => p.lives > 0);
    if (activePlayers.length <= 1) {
      setScreen('winner');
    } else {
      setScreen('roundEnd');
    }
  };

  const handleCancelVote = () => {
    setSelectedPlayer(null);
    setShowConfirmation(false);
  };

  const handleNextRound = () => {
    const activePlayers = players.filter(p => p.lives > 0);
    if (activePlayers.length <= 1) {
      setScreen('winner');
    } else {
      setCurrentRound(currentRound + 1);
      startNewRound(players, currentRound + 1);
    }
  };

  const resetGame = () => {
    setScreen('landing');
    setNumPlayers(2);
    setPlayerNames(['', '']);
    setPersona('');
    setPlayers([]);
    setCurrentRound(1);
    setPlayerOrder([]);
    setCurrentPlayerIndex(0);
    setCurrentQuestionIndex(0);
    setGlobalQuestionIndex(0);
    setQuestions([]);
    setShowingAnswer(false);
    setTimer(settings.questionTime);
    setSelectedPlayer(null);
    setShowConfirmation(false);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: Math.max(1, parseInt(value) || 1)
    }));
  };

  const saveSettings = () => {
    setShowSettings(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderHearts = (lives) => {
    return Array(lives).fill(0).map((_, i) => (
      <Heart key={i} className="inline-block w-5 h-5 fill-red-500 text-red-500" />
    ));
  };

  const getCurrentQuestion = () => {
    return questions[globalQuestionIndex] || { question: '', answer: '' };
  };

  // Landing Screen
  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">The Weakest Link</h1>
          <button
            onClick={startGame}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Start
          </button>
          <button
            onClick={openSettings}
            className="text-sm text-gray-500 mt-4 hover:text-gray-700 underline cursor-pointer block w-full"
          >
            customize settings
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Game Settings</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-semibold">
                    Questions per player per round
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.questionsPerPlayer}
                    onChange={(e) => handleSettingChange('questionsPerPlayer', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-semibold">
                    Time per question (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.questionTime}
                    onChange={(e) => handleSettingChange('questionTime', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-semibold">
                    Time for voting (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.votingTime}
                    onChange={(e) => handleSettingChange('votingTime', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-semibold">
                    Starting lives per player
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.startingLives}
                    onChange={(e) => handleSettingChange('startingLives', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSettings}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={closeSettings}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Setup Screen
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full">
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Number of players</label>
            <input
              type="number"
              min="2"
              max="12"
              value={numPlayers}
              onChange={(e) => handleNumPlayersChange(parseInt(e.target.value) || 2)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Names</label>
            <div className="space-y-3">
              {playerNames.map((name, index) => (
                <input
                  key={index}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder={`Player ${index + 1}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                />
              ))}
            </div>
          </div>

          <button
            onClick={proceedToPersona}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // Persona Screen
  if (screen === 'persona') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Customize Your Experience</h2>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2 font-semibold">
              Describe Your Group
            </label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="e.g., We are product managers who love sports, technology, and pop culture"
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              disabled={isGeneratingQuestions}
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps generate relevant questions for your group
            </p>
          </div>

          <button
            onClick={generateQuestionsWithGemini}
            disabled={isGeneratingQuestions}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-lg text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGeneratingQuestions ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Questions...
              </>
            ) : (
              "Let's go"
            )}
          </button>

          {isGeneratingQuestions && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 text-center mb-2 font-semibold">
                🎯 Crafting your personalized trivia experience...
              </p>
              <p className="text-xs text-blue-600 text-center">
                We're generating questions tailored to your interests. This usually takes 10-30 seconds.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Question Screen
  if (screen === 'question') {
    const currentPlayer = playerOrder[currentPlayerIndex];
    const currentPlayerQuestionNumber = Math.floor(currentQuestionIndex / playerOrder.length) + 1;
    const currentQ = getCurrentQuestion();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Round {currentRound}</h2>
            <div className="text-xl font-bold text-gray-600">{formatTime(timer)} remaining</div>
          </div>

          <div className="mb-8">
            <p className="text-sm text-gray-600 mb-2">Question {currentPlayerQuestionNumber} of {settings.questionsPerPlayer}</p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-xl text-gray-800">{currentQ.question}</p>
              {showingAnswer && (
                <p className="text-xl text-green-600 font-semibold mt-4">{currentQ.answer}</p>
              )}
            </div>
          </div>

          {!showingAnswer ? (
            <button
              onClick={handleAnswer}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Next
            </button>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">{currentPlayer.name}'s turn</p>
            <div className="space-y-1 text-sm text-gray-600">
              {playerOrder.map((player, idx) => (
                <div key={player.id} className={idx === currentPlayerIndex ? 'font-bold' : ''}>
                  {idx === currentPlayerIndex ? '→ ' : ''}{player.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Voting Screen
  if (screen === 'voting') {
    const activePlayers = players.filter(p => p.lives > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">End of Round {currentRound}</h2>
            <div className="text-xl font-bold text-gray-600">{formatTime(timer)} remaining for voting</div>
          </div>

          <div className="space-y-4 mb-8">
            {activePlayers.map(player => (
              <div
                key={player.id}
                onClick={() => !showConfirmation && handlePlayerSelect(player.id)}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlayer === player.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedPlayer === player.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {selectedPlayer === player.id && (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-semibold text-gray-800">{player.name}</span>
                </div>
                <div className="flex gap-1">
                  {renderHearts(player.lives)}
                </div>
              </div>
            ))}
          </div>

          {showConfirmation && selectedPlayer !== null && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-gray-800 mb-4">
                Vote player {players.find(p => p.id === selectedPlayer)?.name}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmVote}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelVote}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showConfirmation && selectedPlayer === null && (
            <p className="text-center text-gray-500 text-sm">Select a player to vote</p>
          )}
        </div>
      </div>
    );
  }

  // Round End Screen
  if (screen === 'roundEnd') {
    const activePlayers = players.filter(p => p.lives > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-2xl w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">End of Round {currentRound}</h2>
            <div className="text-xl text-gray-600 mt-2">{formatTime(0)} remaining for voting</div>
          </div>

          <div className="space-y-4 mb-8">
            {players.map(player => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  player.lives === 0 ? 'border-gray-200 bg-gray-50 line-through text-gray-400' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                  <span className="font-semibold">{player.name}</span>
                </div>
                <div className="flex gap-1">
                  {renderHearts(player.lives)}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNextRound}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            {activePlayers.length > 1 ? 'Start next round?' : 'See winner'}
          </button>
        </div>
      </div>
    );
  }

  // Winner Screen
  if (screen === 'winner') {
    const winner = players.find(p => p.lives > 0) || players[0];

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            {winner.name} is the winner!
          </h1>
          <button
            onClick={resetGame}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Play again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
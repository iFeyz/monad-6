import "./App.css";
import { Canvas } from "@react-three/fiber";
import { ReactTogether } from 'react-together';
import { useState, useEffect } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { CubeTextureLoader } from "three";
import { Scene } from "./Components/Scene";
import ConnectedUser from "./Components/ConnectedUser";
import { PlayerConfig } from "./Components/PlayerConfig";
import ChatManager from "./Components/ChatManager";
import WalletManager from "./Components/WalletManager";
import SessionManager from "./Components/SessionManager";
import { ControlsMenu } from "./Components/ControlsMenu";
import { PointerLockHandler } from "./Components/PointerLock";


// Composant écran de connexion React Together
const ConnectionScreen = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-8 border-2 border-purple-500 rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 bg-purple-500 rounded-sm animate-pulse"></div>
        </div>
        
        <div className="w-64 h-1 bg-gray-800 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full bg-purple-500 rounded-full"
            style={{
              animation: 'loading 2s ease-in-out infinite',
            }}
          ></div>
        </div>
        
        <p className="text-purple-300 text-lg font-light">
          Connecting to session{dots}
        </p>
        
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); width: 0%; }
            50% { transform: translateX(0%); width: 100%; }
            100% { transform: translateX(100%); width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
};

// Composant App/Jeu
const GameApp = ({ onDisconnect, onChangeSession }: { onDisconnect: () => void; onChangeSession: () => void }) => {
  const [isGameLoaded, setIsGameLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading');

  const keyboardMap = [
    { name: "forward", keys: ["ArrowUp", "KeyZ"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "left", keys: ["ArrowLeft", "KeyQ"] },
    { name: "right", keys: ["ArrowRight", "KeyD"] },
  ];



  // Simulation du chargement progressif
  useEffect(() => {
    const loadingSteps = [
      { progress: 20, text: 'Loading resources' },
      { progress: 40, text: 'Initializing Three.js' },
      { progress: 60, text: 'Loading 3D models' },
      { progress: 80, text: 'Connecting to server' },
      { progress: 90, text: 'Synchronizing' },
      { progress: 100, text: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingProgress(loadingSteps[currentStep].progress);
        setLoadingText(loadingSteps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsGameLoaded(true), 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  function Skybox() {
    const { scene } = useThree();
    const loader = new CubeTextureLoader();
    const texture = loader.load([
      'px.png', 'nx.png',
      'py.png', 'ny.png',
      'pz.png', 'nz.png'
    ])
    scene.background = texture;
    return null;
  }

  // Écran de chargement du jeu
  if (!isGameLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md w-full px-4">
          <div className="w-16 h-16 mx-auto mb-8 border-2 border-purple-500 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 bg-purple-500 rounded-sm animate-pulse"></div>
          </div>
          
          <div className="w-full h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          
          <div className="text-purple-400 text-sm mb-2 font-mono">
            {loadingProgress}%
          </div>
          
          <p className="text-purple-300 text-lg font-light">
            {loadingText}
          </p>
        </div>
      </div>
    );
  }

  // Le jeu une fois chargé
  return (
    <>
      <KeyboardControls map={keyboardMap}>
        <div className="absolute top-4 left-4 z-10 w-80">
          <ConnectedUser />
        </div>
        <Canvas camera={{ position: [0, 0, 10] }}>
          <fog attach="fog" args={[0x000000, 0.0025]} />
          <Skybox />
          <Scene />
        </Canvas>
      </KeyboardControls>
      
      <PointerLockHandler />

      {/* Player Config as overlay menu */}
      <PlayerConfig onDisconnect={onDisconnect} onChangeSession={onChangeSession} />
      <ControlsMenu />
      <div className="absolute bottom-5 right-5 px-2 py-1 rounded gap-2 flex text-neutral-50 bg-purple-500">
        <ChatManager />
        <WalletManager />
        <SessionManager />
      </div>
    </>
  );
};

// Composant principal avec écran de session
const SessionScreen = () => {
  const [sessionMode, setSessionMode] = useState<'join' | 'create'>('create');
  const [sessionData, setSessionData] = useState({
    url: '',
    name: '',
    password: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-connect when URL contains session parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const sessionName = urlParams.get('rtName');
    const sessionPassword = hashParams.get('rtPwd');
    
    if (sessionName && sessionPassword) {
      console.log('🔗 Auto-connecting to session:', { name: sessionName, password: sessionPassword });
      
      setSessionData({
        url: '',
        name: sessionName,
        password: sessionPassword
      });
      setSessionMode('create');
      
      // Auto-connect after a short delay
      setTimeout(() => {
        setIsLoading(true);
        setTimeout(() => {
          setIsConnected(true);
          setIsLoading(false);
        }, 1000);
      }, 500);
    }
  }, []);

  const handleConnect = async () => {
    setError('');
    
    if (sessionMode === 'join' && !sessionData.url.trim()) {
      setError('Please enter a session URL');
      return;
    }
    
    if (sessionMode === 'create' && (!sessionData.name.trim() || !sessionData.password.trim())) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsLoading(false);
    setSessionData({ url: '', name: '', password: '' });
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleChangeSession = () => {
    setIsConnected(false);
    setIsLoading(false);
    
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleInputChange = (field: string, value: string) => {
    setSessionData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  if (isLoading) {
    return <ConnectionScreen />;
  }

  if (isConnected) {
    const sessionParams = {
      apiKey: "2UyoWWPeshm6dVAzSbiuCIljeH5hPmi0eu6jVVQakZ",
      appId: "com.exampsssqsdsdssle.myapp", 
      name: sessionMode === 'create' ? sessionData.name : "tests-sesdsdsdsdsqdqsqsdsqddssssssionsss",
      password: sessionMode === 'create' ? sessionData.password : "test-padsdqssword"
    };

    return (
      <ReactTogether sessionParams={sessionParams}>
        <GameApp onDisconnect={handleDisconnect} onChangeSession={handleChangeSession} />
      </ReactTogether>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <img src="/monad_logo.png" alt="Monad Space" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-light text-white mb-2">Monad Space</h1>
          <p className="text-gray-400 text-sm">Join the decentralized universe</p>
        </div>

        <div className="flex bg-gray-900 rounded-lg p-1 mb-8">
          <button
            onClick={() => setSessionMode('join')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              sessionMode === 'join'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Join
          </button>
          <button
            onClick={() => setSessionMode('create')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
              sessionMode === 'create'
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create
          </button>
        </div>

        <div className="space-y-6">
          {sessionMode === 'join' ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Session URL
              </label>
              <input
                type="url"
                value={sessionData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://session.monad.space/..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session name
                </label>
                <input
                  type="text"
                  value={sessionData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="My space session"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={sessionData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            {sessionMode === 'join' ? 'Join session' : 'Create session'}
          </button>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-gray-500">
            Powered by Multisynq • Monad Ecosystem • Made by iFeyz
          </p>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return <SessionScreen />;
}
export type Sound = {
  audio: HTMLAudioElement;
  playing: boolean;
  volume: number;
};

export function createSound(src: string, volume: number = 1): Sound {
  const audio = createAudio(src);
  audio.volume = volume;
  return {
    audio,
    playing: false,
    volume,
  };
}

function createAudio(src: string): HTMLAudioElement {
  return new Audio(src);
}

export function playSound(sound: Sound) {
  sound.audio.play();
  sound.playing = true;

  const callback = () => {
    sound.playing = false;
  };

  sound.audio.addEventListener("ended", callback);
}

export function pauseSound(sound: Sound, delay: number) {
  setTimeout(() => {
    sound.audio.pause();
    sound.playing = false;
  }, delay);
}

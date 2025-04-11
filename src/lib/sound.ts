export type Sound = {
  audio: HTMLAudioElement;
  playing: boolean;
  volume: number;
};

export function createSound(
  audio: HTMLAudioElement,
  volume: number = 1
): Sound {
  audio.volume = volume;
  return {
    audio,
    playing: false,
    volume,
  };
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

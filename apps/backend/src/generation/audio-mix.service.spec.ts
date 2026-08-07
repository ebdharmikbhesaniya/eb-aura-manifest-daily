import { execFileSync } from 'node:child_process';

import ffmpegPath from 'ffmpeg-static';

import { AudioMixService, buildFfmpegArgs } from './audio-mix.service';

describe('buildFfmpegArgs', () => {
  const args = buildFfmpegArgs('/tmp/voice.mp3', '/bed/ambient-loop.mp3', '/tmp/out.mp3');

  it('reads the voice first, then loops the bed', () => {
    expect(args).toEqual([
      '-y',
      '-i',
      '/tmp/voice.mp3',
      '-stream_loop',
      '-1',
      '-i',
      '/bed/ambient-loop.mp3',
      '-filter_complex',
      expect.stringContaining('sidechaincompress'),
      '-map',
      '[mix]',
      '-ac',
      '2',
      '-ar',
      '44100',
      '-b:a',
      '128k',
      '-f',
      'mp3',
      '/tmp/out.mp3',
    ]);
  });

  it('trims the mix to the voice length and does not renormalize the voice', () => {
    const graph = args[args.indexOf('-filter_complex') + 1];
    expect(graph).toContain('duration=first');
    expect(graph).toContain('normalize=0');
    expect(graph).toContain('volume=0.22');
  });
});

describe('AudioMixService.mix', () => {
  // A real 2s tone stands in for the voice mp3.
  function tinyVoiceMp3(): Buffer {
    return execFileSync(
      ffmpegPath as string,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=300:duration=2',
        '-b:a',
        '128k',
        '-f',
        'mp3',
        'pipe:1',
      ],
      { maxBuffer: 10 * 1024 * 1024 },
    );
  }

  it('returns a non-empty mp3 Buffer with the bed baked in', async () => {
    const svc = new AudioMixService();
    const out = await svc.mix(tinyVoiceMp3());
    expect(Buffer.isBuffer(out)).toBe(true);
    expect(out.length).toBeGreaterThan(1000); // real audio, not empty
    // ID3 tag or MPEG frame sync — it is an mp3, not an error blob.
    const isId3 = out.subarray(0, 3).toString('binary') === 'ID3';
    const isFrameSync = out.length > 1 && out[0] === 0xff && (out[1]! & 0xe0) === 0xe0;
    expect(isId3 || isFrameSync).toBe(true);
  }, 30000);
});

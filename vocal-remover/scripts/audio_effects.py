import sys
import json
import os
import subprocess
import numpy as np

def apply_effects(file_path, params, output_path):
    try:
        if not os.path.exists(file_path):
            return {"success": False, "error": f"Input file does not exist: {file_path}"}

        pitch_shift = params.get("pitch", 0)
        speed_factor = params.get("speed", 1.0)
        reverb_level = params.get("reverb", 0)  # 0-10 scale

        # Import required libraries
        try:
            import librosa
            import soundfile as sf
            print("Libraries imported successfully", file=sys.stderr)
        except ImportError as e:
            return {"success": False, "error": f"Missing library: {str(e)}. Run: pip install librosa soundfile"}

        # Check if FFmpeg is available
        try:
            subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            print("FFmpeg is available", file=sys.stderr)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return {"success": False, "error": "FFmpeg is not installed or not in PATH"}

        # Load audio for analysis
        try:
            print(f"Loading audio file: {file_path}", file=sys.stderr)
            y, sr = librosa.load(file_path, sr=None)
            print(f"Audio loaded: {len(y)} samples @ {sr} Hz", file=sys.stderr)

            # Get original duration
            original_duration = len(y) / sr
            print(f"Original duration: {original_duration:.2f} seconds", file=sys.stderr)
        except Exception as e:
            return {"success": False, "error": f"Failed to load audio: {str(e)}"}

        # Create temporary files for processing chain
        temp_dir = os.path.dirname(output_path)
        base_name = os.path.splitext(os.path.basename(output_path))[0]
        
        temp_pitch_file = os.path.join(temp_dir, f"{base_name}_temp_pitch.wav")
        temp_speed_file = os.path.join(temp_dir, f"{base_name}_temp_speed.wav")
        
        current_file = file_path
        
        # Apply pitch shift using librosa if needed
        if pitch_shift != 0:
            try:
                print(f"Applying pitch shift: {pitch_shift} semitones", file=sys.stderr)
                y_pitched = librosa.effects.pitch_shift(y, sr=sr, n_steps=pitch_shift)
                sf.write(temp_pitch_file, y_pitched, sr)
                current_file = temp_pitch_file
                print(f"Pitch shift applied, current file: {current_file}", file=sys.stderr)
            except Exception as e:
                print(f"Pitch shift failed: {str(e)}", file=sys.stderr)
                return {"success": False, "error": f"Pitch shift failed: {str(e)}"}

        # Apply speed change using FFmpeg if needed
        if speed_factor != 1.0:
            try:
                print(f"Applying speed change: {speed_factor}x", file=sys.stderr)
                cmd = [
                    'ffmpeg', '-y', '-i', current_file,
                    '-filter:a', f'atempo={speed_factor}',
                    temp_speed_file
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    raise Exception(f"FFmpeg speed change failed: {result.stderr}")
                current_file = temp_speed_file
                print(f"Speed change applied, current file: {current_file}", file=sys.stderr)
            except Exception as e:
                print(f"Speed change failed: {str(e)}", file=sys.stderr)
                return {"success": False, "error": f"Speed change failed: {str(e)}"}

        # Apply reverb using FFmpeg if needed
        if reverb_level > 0:
            try:
                print(f"Applying reverb: level {reverb_level}", file=sys.stderr)
                print(f"Current file for reverb processing: {current_file}", file=sys.stderr)
                
                # Path to reverb impulse response file
                reverb_ir_path = os.path.join(os.getcwd(), "public", "reverbs", "Hall.wav")
                print(f"Looking for reverb IR at: {reverb_ir_path}", file=sys.stderr)
                
                # Check if reverb IR file exists
                if not os.path.exists(reverb_ir_path):
                    print(f"Reverb IR file not found, using built-in echo effect", file=sys.stderr)
                    # Use FFmpeg's built-in reverb instead
                    reverb_strength = reverb_level / 10.0  # Convert 0-10 to 0.0-1.0
                    volume_boost = 1.0 + (reverb_strength * 0.8)  # 1.0 to 1.8x volume
                    
                    print(f"Echo settings - strength: {reverb_strength}, volume: {volume_boost:.2f}", file=sys.stderr)
                    
                    cmd = [
                        'ffmpeg', '-y', '-i', current_file,
                        '-filter:a', f'aecho=0.8:0.88:60:0.4,volume={volume_boost:.2f}',
                        output_path
                    ]
                    
                    print(f"Running echo command: {' '.join(cmd)}", file=sys.stderr)
                    
                else:
                    print(f"Using convolution reverb with hall.wav", file=sys.stderr)
                    # Use convolution reverb with impulse response
                    # Linear scaling: level 1 = 1.1x volume, level 10 = 2.0x volume
                    volume_factor = 1.0 + (reverb_level / 10.0)
                    
                    print(f"Convolution settings - volume: {volume_factor:.2f}", file=sys.stderr)
                    
                    cmd = [
                        'ffmpeg', '-y',
                        '-i', current_file,
                        '-i', reverb_ir_path,
                        '-filter_complex', f'afir,volume={volume_factor:.2f}',
                        output_path
                    ]
                    
                    print(f"Running convolution command: {' '.join(cmd)}", file=sys.stderr)
                
                # Execute the FFmpeg command
                print("Executing FFmpeg command...", file=sys.stderr)
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                print(f"FFmpeg exit code: {result.returncode}", file=sys.stderr)
                if result.stdout:
                    print(f"FFmpeg stdout: {result.stdout}", file=sys.stderr)
                if result.stderr:
                    print(f"FFmpeg stderr: {result.stderr}", file=sys.stderr)
                
                if result.returncode != 0:
                    raise Exception(f"FFmpeg reverb failed: {result.stderr}")
                
                print("Reverb processing completed successfully", file=sys.stderr)
                
                # Verify output file was created
                if not os.path.exists(output_path):
                    raise Exception("Output file was not created after reverb processing")
                    
            except Exception as e:
                print(f"Reverb failed with error: {str(e)}", file=sys.stderr)
                # Fallback: copy current file to output without reverb
                try:
                    import shutil
                    print("Falling back to copy without reverb", file=sys.stderr)
                    shutil.copy2(current_file, output_path)
                    print("Applied effects without reverb as fallback", file=sys.stderr)
                except Exception as copy_error:
                    return {"success": False, "error": f"Reverb failed and fallback copy failed: {str(copy_error)}"}
        else:
            # No reverb needed, copy current file to output
            try:
                import shutil
                print("No reverb requested, copying file", file=sys.stderr)
                print(f"Copying from: {current_file} to: {output_path}", file=sys.stderr)
                shutil.copy2(current_file, output_path)
                print("File copied without reverb", file=sys.stderr)
            except Exception as copy_error:
                return {"success": False, "error": f"Failed to copy processed file: {str(copy_error)}"}

        # Clean up temporary files
        for temp_file in [temp_pitch_file, temp_speed_file]:
            try:
                if os.path.exists(temp_file):
                    print(f"Cleaning up temp file: {temp_file}", file=sys.stderr)
                    os.remove(temp_file)
            except Exception as e:
                print(f"Failed to clean up temp file {temp_file}: {e}", file=sys.stderr)

        # Verify final output exists
        if not os.path.exists(output_path):
            return {"success": False, "error": "Output file was not created"}

        print(f"Final output file created: {output_path}", file=sys.stderr)

        # Analyze final audio for BPM and Key
        try:
            print("Loading final audio for analysis", file=sys.stderr)
            final_y, final_sr = librosa.load(output_path, sr=None)
        except:
            print("Using original audio for analysis", file=sys.stderr)
            final_y, final_sr = y, sr

        # Detect BPM
        bpm = None
        try:
            print("Analyzing BPM...", file=sys.stderr)
            tempo, _ = librosa.beat.beat_track(y=final_y, sr=final_sr)
            # Fix the numpy deprecation warning
            if hasattr(tempo, 'item'):
                bpm = tempo.item()
            else:
                bpm = float(tempo)
            print(f"Detected BPM: {bpm}", file=sys.stderr)
        except Exception as e:
            print(f"BPM detection failed: {str(e)}", file=sys.stderr)

        # Detect Key with improved algorithm
        key = "Not detected"
        try:
            print("Analyzing key...", file=sys.stderr)
            # Use harmonic component for better key detection
            y_harmonic = librosa.effects.harmonic(final_y)
            chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=final_sr, bins_per_octave=36)
            chroma_mean = chroma.mean(axis=1)
    
            # Apply weighting to emphasize tonic
            chroma_weighted = chroma_mean * np.array([1.0, 0.5, 0.8, 0.5, 0.9, 0.7, 0.5, 1.0, 0.6, 0.8, 0.5, 0.7])

            pitch_class = chroma_weighted.argmax()
            keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

            # Determine major/minor using circle of fifths and chord analysis
            major_profile = np.array([1.0, 0.0, 0.5, 0.0, 0.8, 0.5, 0.0, 0.8, 0.0, 0.6, 0.0, 0.4])
            minor_profile = np.array([1.0, 0.0, 0.4, 0.8, 0.0, 0.5, 0.0, 0.6, 0.8, 0.0, 0.4, 0.0])

            # Rotate profiles to match detected key
            rotated_major = np.roll(major_profile, pitch_class)
            rotated_minor = np.roll(minor_profile, pitch_class)

            major_correlation = np.corrcoef(chroma_mean, rotated_major)[0, 1]
            minor_correlation = np.corrcoef(chroma_mean, rotated_minor)[0, 1]

            if major_correlation > minor_correlation:
                key = keys[pitch_class] + " major"
            else:
                key = keys[pitch_class] + " minor"

            print(f"Detected key: {key}", file=sys.stderr)
        except Exception as e:
            print(f"Key detection failed: {str(e)}", file=sys.stderr)

        # Get final duration
        final_duration = len(final_y) / final_sr

        return {
            "success": True,
            "key": key,
            "bpm": bpm,
            "output_path": output_path,
            "original_duration": original_duration,
            "final_duration": final_duration,
            "speed_factor": speed_factor,
            "reverb_level": reverb_level
        }

    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}

def main():
    try:
        if len(sys.argv) != 4:
            print(json.dumps({"success": False, "error": "Usage: python audio_effects.py <input_file> <params_json> <output_file>"}))
            return

        file_path = sys.argv[1]
        params_json = sys.argv[2]
        output_path = sys.argv[3]

        print(f"Script args: {sys.argv[1:]}", file=sys.stderr)

        try:
            params = json.loads(params_json)
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON parameters: {str(e)}"}))
            return

        result = apply_effects(file_path, params, output_path)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Script error: {str(e)}"}))

if __name__ == "__main__":
    main()
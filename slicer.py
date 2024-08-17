import subprocess
import random

input_video = input("Enter the file name of the video: ")
slice_number = int(input("Enter the number of slices: "))+1

sequence = [str(i) for i in range(1, slice_number)]; random.shuffle(sequence)

slicer = "".join((
    f'ffmpeg -i "{input_video}" ',
    '-filter_complex "',
    ''.join([f'[0:v]crop=iw/30:ih:{i-1}*ow:0 [v{i}]; ' for i in range(1, slice_number)]),
    ''.join([f'[v{i}]' for i in sequence]),
    f'hstack=inputs={slice_number-1}[v]; " -map "[v]" -map 0:a sliced.mkv',
    # f'[a:0]asplit={slice_number-1}', ''.join([f"[a{i}]" for i in range(1, slice_number)]), '; ',
    # ''.join([f"[a{i}]" for i in sequence]),
    # f'amerge=inputs={slice_number-1}[a]; " -map "[v]" -map "[a]" sliced.mkv'
))

print(",".join(sequence))
print(slicer)

subprocess.run(slicer, shell=True)

#11,25,17,18,8,28,23,22,6,27,7,26,20,5,16,2,12,24,9,13,29,19,1,4,15,21,3,10,30,14
"""Generate photoreal monster assets with RealVisXL (SDXL) on the local GPU.

Outputs (rampage2026/assets/gen_raw/): head_<kind>_<expr>_<seed>.png candidates and
tex_<name>.png material textures. Pick/clean them with post_assets.py.
"""
import os, sys, torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler

OUT = 'I:/ai_root/rampage/analysis/gen_raw/'
os.makedirs(OUT, exist_ok=True)
MODEL = sys.argv[1]
only = sys.argv[2] if len(sys.argv) > 2 else None

pipe = StableDiffusionXLPipeline.from_pretrained(MODEL, torch_dtype=torch.float16, variant='fp16', use_safetensors=True)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
pipe.enable_model_cpu_offload()
pipe.vae.enable_slicing()

NEG = ('cartoon, anime, drawing, illustration, painting, 3d render, cgi, toy, plush, cute, human, person, '
       'full body, multiple heads, text, watermark, logo, frame, border, blurry, lowres, deformed, cropped head')
HEAD_COMMON = ('photorealistic studio photograph, head and neck only, side three-quarter profile view facing right, '
               'isolated on a plain flat light grey background, dramatic rim lighting, ultra detailed, sharp focus, 8k')
EXPR = {
    'snarl': 'snarling menacingly, lips curled back, huge sharp fangs bared, mouth slightly open',
    'roar': 'roaring furiously with mouth wide open, huge sharp fangs and teeth, saliva strands',
}
SUBJECT = {
    'george': 'a giant monstrous mutant gorilla, King Kong, massive heavy brow ridge, glowing red eyes, dark brown shaggy fur, leathery dark face',
    'lizzie': 'a giant kaiju lizard monster, Godzilla-like reptile, bumpy green scaly skin, row of orange spikes on the head, fierce yellow-red slit eyes, long crocodile snout',
    'ralph': 'a giant snarling werewolf monster, grey shaggy wolf fur, pointed ears pinned back, glowing red eyes, long wolf muzzle, wrinkled snout',
}
TEX = {
    'fur_brown': 'seamless texture, extreme close-up of dense dark brown gorilla fur, hair strands, top-down flat even lighting, photorealistic, highly detailed',
    'fur_grey': 'seamless texture, extreme close-up of dense grey wolf fur with lighter tips, hair strands, top-down flat even lighting, photorealistic, highly detailed',
    'scales_green': 'seamless texture, extreme close-up of green crocodile reptile skin, bumpy scales, top-down flat even lighting, photorealistic, highly detailed',
    'skin_gorilla': 'seamless texture, extreme close-up of dark brown wrinkled leathery gorilla skin, top-down flat even lighting, photorealistic, highly detailed',
    'belly_reptile': 'seamless texture, extreme close-up of yellow beige reptile belly scales, rectangular plates, top-down flat even lighting, photorealistic',
    'skin_wolf': 'seamless texture, extreme close-up of tan beige short fur, top-down flat even lighting, photorealistic, highly detailed',
}

def gen(prompt, path, seed, w=1024, h=1024, steps=28):
    if os.path.exists(path):
        return
    g = torch.Generator('cuda').manual_seed(seed)
    img = pipe(prompt=prompt, negative_prompt=NEG, width=w, height=h, num_inference_steps=steps, guidance_scale=6.0, generator=g).images[0]
    img.save(path)
    print('saved', path, flush=True)

if only in (None, 'tex'):
    for name, pr in TEX.items():
        gen(pr, f'{OUT}tex_{name}.png', 7, 768, 768, 24)
if only in (None, 'heads'):
    for kind, subj in SUBJECT.items():
        for expr, e in EXPR.items():
            for seed in (11, 23, 37):
                gen(f'{subj}, {e}, {HEAD_COMMON}', f'{OUT}head_{kind}_{expr}_{seed}.png', seed)

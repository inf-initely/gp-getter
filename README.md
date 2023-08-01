# General Purpose GET Fetcher

Initially made to get ArcGIS resources concurrently, albeit not that great in performance...

## Environment

Developed in `deno` environment. Standard library version `0.105.0`.

## Compiling

Compile `run.ts` with:
```
deno compile --output ./dist/run ./run.ts
```

or just use the compiled binary for windows `./dist/run.exe`.

## Usage

```
run.exe [input-file] [url] [args]
```

where:
- `input-file`: path to file containing list of resources to get, separated by newline
- `url`: url containing literal `[INJECT]` where it will be replaced with each line from `input-file`
- `args`:
  - `-O` or `--output`: path to store the output, should be a directory, defaults to `result/`
  - `-F` or `--failed-location`: path to file to log resources that are failed to get, defaults to `./failed.txt`
  - `-C` or `--concurrency-limit`: how many concurrent process/promises spawned at a time, defaults to 10 (doesn't always equal to how much HTTP client & transport spawned)

For example, running `./dist/run.cmd`:
```
./run.exe input.txt "http://gis-portal.kemendesa.go.id/server/rest/services/Pusdatin/IDM_2018/MapServer/3/query?where=KODEDESA_K='[INJECT]'&f=geojson"
```

Will fetch `http://gis-portal.kemendesa.go.id/server/rest/services/Pusdatin/IDM_2018/MapServer/3/query?where=KODEDESA_K='[INJECT]'&f=geojson` using `input.txt` as resources list, outputting resources to default output directory (`result/`)

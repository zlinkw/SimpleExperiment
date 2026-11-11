"""Ordinary PyTorch entry point: synthetic classification, CSV metrics and a model file."""
import argparse
import csv
import json
from pathlib import Path

import torch
import yaml


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--mode", choices=["train", "test"], required=True)
    args = parser.parse_args()
    config = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))
    torch.manual_seed(args.seed)
    torch.set_num_threads(1)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    features = torch.randn(320, 8)
    labels = (features[:, 0] + features[:, 1] * 0.5 > 0).long()
    model = torch.nn.Sequential(torch.nn.Linear(8, 16), torch.nn.ReLU(), torch.nn.Linear(16, 2))
    if args.mode == "train":
        optimizer = torch.optim.Adam(model.parameters(), lr=float(config["learning_rate"]))
        for epoch in range(int(config["epochs"])):
            optimizer.zero_grad()
            loss = torch.nn.functional.cross_entropy(model(features[:256]), labels[:256])
            loss.backward()
            optimizer.step()
            print(json.dumps({"epoch": epoch + 1, "max_epoch": config["epochs"], "loss": loss.item()}), flush=True)
        torch.save(model.state_dict(), output / "model.pt")
    else:
        model.load_state_dict(torch.load(output / "model.pt", map_location="cpu", weights_only=True))
        model.eval()
        with torch.no_grad():
            logits = model(features[256:])
            loss = torch.nn.functional.cross_entropy(logits, labels[256:]).item()
            accuracy = (logits.argmax(1) == labels[256:]).float().mean().item()
        with (output / "metrics.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["seed", "accuracy", "loss"])
            writer.writeheader()
            writer.writerow({"seed": args.seed, "accuracy": accuracy, "loss": loss})
        print(json.dumps({"seed": args.seed, "accuracy": accuracy, "loss": loss}), flush=True)


if __name__ == "__main__":
    main()

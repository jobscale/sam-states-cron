# EC2 の構築

## ネットワーク・セキュリティ

### セキュリティグループ

自分のIPアドレスを調べる

```
curl https://inet-ip.info/ip
curl https://ipinfo.io/ip
curl https://ifconfig.io/ip
```

VPC の CIDR を確認する

- デフォルトのセキュリティグループは使用しない

|名前|タイプ|ポート|ソース||
|--|:--:|:--:|--|--|
|ssh|インバウンド|22/TCP|{自分のIPアドレス}/32||
||アウトバウンド|なし|||
|local|インバウンド|すべてのトラフィック|{VPC の CIDR}||
||アウトバウンド|なし|||
|mysql|インバウンド|3306/TCP|sg-自分自身のID||
||アウトバウンド|3306/TCP|sg-自分自身のID||
|postgres|インバウンド|5432/TCP|sg-自分自身のID||
||アウトバウンド|5432/TCP|sg-自分自身のID||
|internet|アウトバウンド|53/UDP|0.0.0.0/0||
|||53/TCP|0.0.0.0/0|(必要なら)|
|||443/TCP|0.0.0.0/0||

- sg-自分自身のIDは最初は不明なので一旦なしで保存する
- EC2 の間で通信を行わないときは local は不要

## キーペア

- ed25519

## EC2 インスタンス

### EC2 のインスタンスを作成

> [チュートリアル](https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/EC2_GetStarted.html)

- AMI は 一般的に利用されているものを選ぶ
- - Ubuntu 22.04 LTS (Jammy)
- - Debian 11 (Bullseye)
- サブネットはパブリックサブネットを選ぶ

### EC2 の設定

- Linux に自分のアカウントを作成
```
userAdd() {
  sudo useradd -g staff -G users,sudo --shell $(which bash) --create-home $1
  SSH_GEN='ssh-keygen -t ed25519 -N "" -C "$(id -un)@$(hostname)" -f /home/$(id -un)/.ssh/id_ed25519'
  SSH_AUTH='cat /home/$(id -un)/.ssh/id_ed25519.pub | tee -a /home/$(id -un)/.ssh/authorized_keys'
  SSH_SHOW='cat /home/$(id -un)/.ssh/id_ed25519'
  sudo -i -u $1 bash -c "$SSH_GEN && $SSH_AUTH && $SSH_SHOW"
}
userAdd user.name
```

> 秘密鍵 `BEGIN OPENSSH PRIVATE KEY` を保存<br>
([POSIX](https://ja.wikipedia.org/wiki/POSIX) に準拠する必要がある)<br>
自分のアカウントでログインする<br>

- 標準的なコマンドをインストール
```
export DEBIAN_FRONTEND=noninteractive
alias sudo='sudo -E'
eval $(cat /etc/os-release)
{
  sudo apt update
  sudo apt install -y apt-transport-https
  sudo apt update
  sudo apt full-upgrade -y

  sudo apt install -y curl git vim tmux htop \
    iproute2 dnsutils ncat netcat iputils-ping \
    procps whois nmap traceroute  \
    python3-pip unzip zip tree colordiff
  sudo apt autoremove -y
}
```

- docker をインストール
```
export DEBIAN_FRONTEND=noninteractive
alias sudo='sudo -E'
eval $(cat /etc/os-release)
{
  sudo apt update
  sudo apt install -y apt-transport-https

  echo ${ID,,} ${VERSION_CODENAME}
  curl -fsSL https://download.docker.com/linux/${ID,,}/gpg | sudo apt-key add -
  sudo add-apt-repository "deb https://download.docker.com/linux/${ID,,} ${VERSION_CODENAME} stable"
  sudo apt update
  sudo apt install -y docker-ce
  sudo usermod -aG docker $(whoami)
}
```

- nodejs をインストール
```
{
  curl -fsSLo- https://raw.githubusercontent.com/creationix/nvm/$(
    git ls-remote --refs --tags https://github.com/nvm-sh/nvm.git | sort -t '/' -k 3 -V | tail -1 | awk -F/ '{print $3}'
  )/install.sh | bash
  . ~/.bashrc
  LATEST=$(nvm ls-remote | grep 'Latest LTS' | tail -1 | awk '{print $1}')
  nvm install $LATEST
  nvm alias default $LATEST
  nvm use $LATEST
  node --version
  npm --version
}
```

- 日本語対応
```
export DEBIAN_FRONTEND=noninteractive
alias sudo='sudo -E'
eval $(cat /etc/os-release)
{
  sudo apt update
  sudo apt install -y locales

  sudo sed -i -e 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen
  locale-gen
  update-locale LANG=ja_JP.UTF-8
  echo "export TZ=Asia/Tokyo" | tee -a /etc/bash.bashrc
}
```

- EC2 を再起動
```
sudo reboot
```

- 共有ディレクトリを設定

```
umask u=rwx,g=rwx,o=
mkdir task
sudo mv task /
```

## EFS を利用する場合

[DNS 名を使用して Amazon EC2 にマウントする](https://docs.aws.amazon.com/ja_jp/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)<br>
nfs サービスを開始する必要はなく、マウントするだけで OK

## プライベートサブネットの設定

- インターネットにアクセスできないサブネット

> プライベートサブネットからインターネットにアクセスするには、ひとつのパブリックサブネットに [NAT ゲートウェイ](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-nat-gateway.html)を作成する [イメージ図](https://go.aws/3C6xULL)

## RDB インスタンス

### Aurora クラスタの作成

- パブリックにはしない
- セキュリティグループは mysql または postgres を割り当てる

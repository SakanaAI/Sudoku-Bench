FROM python:3.11.10-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Tokyo

# Install necessary packages, Google Chrome, Chrome driver
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg unzip graphviz build-essential \
    fonts-liberation python3-selenium xdg-utils && \
    # Add Google Chrome repository
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | \
    gpg --dearmor > /usr/share/keyrings/google-linux-signing-key.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] \
    http://dl.google.com/linux/chrome/deb/ stable main" > \
    /etc/apt/sources.list.d/google-chrome.list && \
    # Install Google Chrome
    apt-get update && apt-get install -y --no-install-recommends google-chrome-stable && \
    # Install Chrome driver
    CHROME_VERSION=$(google-chrome-stable --version | cut -d " " -f3) && \
    echo "Chrome_Version: ${CHROME_VERSION}" && \
    wget -nv -O /tmp/chromedriver-linux64.zip https://storage.googleapis.com/chrome-for-testing-public/$CHROME_VERSION/linux64/chromedriver-linux64.zip && \
    unzip /tmp/chromedriver-linux64.zip -d /tmp/ && \
    rm /tmp/chromedriver-linux64.zip && \
    chown root:root /tmp/chromedriver-linux64/chromedriver && \
    chmod 755 /tmp/chromedriver-linux64/chromedriver && \
    mv /tmp/chromedriver-linux64/chromedriver /usr/bin/chromedriver && \
    rm -rf /tmp/chromedriver-linux64 && \
    # Clear cache
    apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy fonts
COPY ./fonts/tahoma.ttf /usr/share/fonts/truetype/tahoma.ttf
COPY ./fonts/tahomabd.ttf /usr/share/fonts/truetype/tahomabd.ttf

# Copy requirements.txt
COPY ./requirements.txt /tmp/requirements.txt

# Install Python packages
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt && \
    rm -rf /tmp/requirements.txt

# Copy SudokuPad App
COPY ./sudoku_pad/ /home/user/sudoku_pad/

# Working directory
WORKDIR /home/user

# Default command
CMD ["/bin/bash"]
